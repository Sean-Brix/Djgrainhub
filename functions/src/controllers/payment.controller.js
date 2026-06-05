const crypto = require("crypto");
const { db, docToObj } = require("../lib/db");
const {
  completeSaleById,
  failSaleByPaymentIntentId,
} = require("./sales.controller");

const PAYMONGO_BASE = "https://api.paymongo.com/v1";

function basicAuth() {
  const key = process.env.PAYMONGO_SECRET_KEY || "";
  return "Basic " + Buffer.from(`${key}:`).toString("base64");
}

async function pmFetch(method, path, body = null) {
  const headers = {
    Authorization: basicAuth(),
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const res = await fetch(`${PAYMONGO_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw { status: res.status, data };
  return data;
}

// In-memory webhook log (dev/debug — resets on cold start)
const webhookLog = [];
const WEBHOOK_LOG_COLLECTION = "paymentWebhookLogs";
const PAYMENT_DEBUG_COLLECTION = "paymentDebugLogs";

function cleanForFirestore(value) {
  if (value === undefined || value === null) return null;
  if (Array.isArray(value)) return value.map(cleanForFirestore);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [key, cleanForFirestore(val)])
    );
  }
  return value;
}

function safeError(err) {
  return {
    message: err?.message || String(err || "Unknown error"),
    status: err?.status || null,
    data: err?.data || null,
  };
}

function summarizePaymentIntent(intent) {
  const attrs = intent?.data?.attributes || {};
  const payments = Array.isArray(attrs.payments) ? attrs.payments : [];
  return {
    id: intent?.data?.id || null,
    status: attrs.status || null,
    amount: attrs.amount ?? null,
    currency: attrs.currency || null,
    paymentsCount: payments.length,
    paymentStatuses: payments.map((payment) => {
      const paymentAttrs = payment?.attributes || payment || {};
      return {
        id: payment?.id || null,
        status: paymentAttrs.status || null,
        amount: paymentAttrs.amount ?? null,
        type: paymentAttrs.type || paymentAttrs.source?.type || null,
      };
    }),
    lastPaymentError: attrs.last_payment_error || null,
  };
}

function extractIntentIdFromResource(resource) {
  const attrs = resource?.attributes || {};
  return (
    attrs.payment_intent_id ||
    attrs.payment_intent?.id ||
    (typeof attrs.payment_intent === "string" ? attrs.payment_intent : null) ||
    (String(resource?.id || "").startsWith("pi_") ? resource.id : null)
  );
}

async function writePaymentLog(kind, details = {}, collection = WEBHOOK_LOG_COLLECTION) {
  const entry = cleanForFirestore({
    timestamp: new Date().toISOString(),
    createdAtMs: Date.now(),
    kind,
    ...details,
  });

  webhookLog.unshift(entry);
  if (webhookLog.length > 100) webhookLog.length = 100;

  try {
    await db.collection(collection).add(entry);
  } catch (err) {
    console.error("[PaymentDebug] Failed to persist log:", err.message);
  }

  console.log(`[PaymentDebug] ${kind}`, JSON.stringify(entry));
  return entry;
}

function parseSignatureHeader(header) {
  return String(header || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, part) => {
      const separator = part.indexOf("=");
      if (separator === -1) return acc;
      acc[part.slice(0, separator)] = part.slice(separator + 1);
      return acc;
    }, {});
}

function timingSafeHexEqual(received, expected) {
  if (!/^[a-f0-9]+$/i.test(received || "") || !/^[a-f0-9]+$/i.test(expected || "")) {
    return false;
  }

  const receivedBuffer = Buffer.from(received, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return (
    receivedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

function getRawBodyString(req) {
  if (typeof req.rawBody === "string") return req.rawBody;
  if (Buffer.isBuffer(req.rawBody)) return req.rawBody.toString("utf8");
  if (typeof req.body === "string") return req.body;
  return null;
}

function getWebhookSecrets() {
  return [
    process.env.PAYMONGO_WEBHOOK_SECRET,
    process.env.PAYMONGO_WEBHOOK_SECRET_ALT,
    ...(process.env.PAYMONGO_WEBHOOK_SECRETS || "").split(","),
  ]
    .map((secret) => String(secret || "").trim())
    .filter(Boolean)
    .filter((secret, index, all) => all.indexOf(secret) === index);
}

function isPaymentIntentPaid(intent) {
  const attrs = intent?.data?.attributes || {};
  const payments = Array.isArray(attrs.payments) ? attrs.payments : [];
  return (
    attrs.status === "succeeded" ||
    payments.some((payment) => {
      const paymentAttrs = payment?.attributes || payment || {};
      return paymentAttrs.status === "paid";
    })
  );
}

function verifyWebhookSignature(req) {
  const webhookSecrets = getWebhookSecrets();
  if (webhookSecrets.length === 0) {
    return {
      ok: process.env.NODE_ENV !== "production",
      status: 500,
      error: "Webhook secret is not configured",
    };
  }

  const sigHeader = req.headers["paymongo-signature"];
  if (!sigHeader) {
    return { ok: false, status: 400, error: "Missing signature" };
  }

  const parts = parseSignatureHeader(sigHeader);
  const timestamp = parts.t;
  const isLiveEvent = req.body?.data?.attributes?.livemode === true;
  const receivedSig = (isLiveEvent ? parts.li : parts.te) || parts.li || parts.te;

  if (!timestamp || !receivedSig) {
    return { ok: false, status: 400, error: "Invalid signature header" };
  }

  const rawBody = getRawBodyString(req);
  if (!rawBody) {
    return { ok: false, status: 400, error: "Raw body unavailable" };
  }

  const isValid = webhookSecrets.some((secret) => {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");
    return timingSafeHexEqual(receivedSig, expected);
  });

  if (!isValid) {
    return { ok: false, status: 400, error: "Invalid signature" };
  }

  return { ok: true };
}

async function findSaleByPaymentIntentId(intentId) {
  const snap = await db.collection("sales")
    .where("paymentIntentId", "==", intentId)
    .limit(1)
    .get();

  return snap.empty ? null : { id: snap.docs[0].id, ...snap.docs[0].data() };
}

async function completeSaleForPaidIntent(intentId, paidAmount) {
  if (!intentId) return;

  const sale = await findSaleByPaymentIntentId(intentId);
  if (!sale) {
    console.warn(`  -> No sale found for intentId: ${intentId}`);
    return;
  }

  const paidCentavos = Number(paidAmount);
  const expectedCentavos = Math.round(Number(sale.totalPrice) * 100);
  if (Number.isFinite(paidCentavos) && paidCentavos !== expectedCentavos) {
    console.error(
      `  -> Amount mismatch for sale ${sale.id}: paid ${paidCentavos}, expected ${expectedCentavos}`
    );
    const err = new Error("Paid amount does not match the pending sale amount");
    err.status = 409;
    throw err;
  }

  const completedSale = await completeSaleById(sale.id);
  console.log(`  -> Sale ${sale.id} confirmed via webhook`);
  return completedSale;
}

async function markSaleFailedForIntent(intentId) {
  if (!intentId) return;

  const result = await failSaleByPaymentIntentId(intentId);
  if (result.count > 0) {
    console.log(`  -> Pending sale for intent ${intentId} marked failed`);
  } else {
    console.log(`  -> No pending sale to mark failed for intent ${intentId}`);
  }
}

// ─── POST /api/payment/intent ─────────────────────────────────────────
const createPaymentIntent = async (req, res) => {
  const { amount, description = "DJ Grain Hub Purchase", payment_method_types = ["gcash", "paymaya", "card"] } = req.body;
  if (!amount || Number(amount) < 1) {
    return res.status(400).json({ error: "amount is required and must be ≥ 1 (PHP)" });
  }
  const centavos = Math.round(Number(amount) * 100);
  try {
    const data = await pmFetch("POST", "/payment_intents", {
      data: {
        attributes: {
          amount: centavos,
          payment_method_allowed: payment_method_types,
          payment_method_options: { card: { request_three_d_secure: "any" } },
          currency: "PHP",
          capture_type: "automatic",
          description,
        },
      },
    });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json(err.data || { error: "PayMongo error" });
  }
};

// ─── GET /api/payment/intent/:id ─────────────────────────────────────
const getPaymentIntent = async (req, res) => {
  try {
    const data = await pmFetch("GET", `/payment_intents/${req.params.id}`);
    const summary = summarizePaymentIntent(data);
    if (isPaymentIntentPaid(data)) {
      try {
        await completeSaleForPaidIntent(req.params.id, data?.data?.attributes?.amount);
      } catch (err) {
        console.error(`  -> Error syncing paid intent ${req.params.id}:`, err.message);
        await writePaymentLog("intent-sync-error", {
          route: req.originalUrl,
          intentId: req.params.id,
          intent: summary,
          error: safeError(err),
        }, PAYMENT_DEBUG_COLLECTION);
      }
    }
    await writePaymentLog("intent-status-read", {
      route: req.originalUrl,
      intentId: req.params.id,
      intent: summary,
      paidDetected: isPaymentIntentPaid(data),
    }, PAYMENT_DEBUG_COLLECTION);
    res.json(data);
  } catch (err) {
    await writePaymentLog("intent-status-error", {
      route: req.originalUrl,
      intentId: req.params.id,
      error: safeError(err),
    }, PAYMENT_DEBUG_COLLECTION);
    res.status(err.status || 500).json(err.data || { error: "PayMongo error" });
  }
};

const confirmPaymentIntent = async (req, res) => {
  const { saleId } = req.body || {};

  try {
    // Check Firestore first — if webhook already completed the sale, return immediately
    // without waiting for PayMongo to reflect the status change.
    const localSale = await findSaleByPaymentIntentId(req.params.id);
    if (localSale?.status === "completed") {
      await writePaymentLog("intent-confirm-already-completed", {
        route: req.originalUrl,
        intentId: req.params.id,
        requestedSaleId: saleId || null,
        matchedSale: { id: localSale.id, status: localSale.status, totalPrice: localSale.totalPrice },
      }, PAYMENT_DEBUG_COLLECTION);
      return res.json({ paid: true, status: "completed", sale: localSale });
    }

    const data = await pmFetch("GET", `/payment_intents/${req.params.id}`);
    const attrs = data?.data?.attributes || {};
    const status = attrs.status;
    const intentSummary = summarizePaymentIntent(data);
    const sale = localSale;
    const paidDetected = isPaymentIntentPaid(data);

    if (!paidDetected) {
      await writePaymentLog("intent-confirm-unpaid", {
        route: req.originalUrl,
        intentId: req.params.id,
        requestedSaleId: saleId || null,
        matchedSale: sale ? { id: sale.id, status: sale.status, totalPrice: sale.totalPrice } : null,
        intent: intentSummary,
      }, PAYMENT_DEBUG_COLLECTION);
      return res.json({ paid: false, status, intent: data });
    }

    if (!sale) {
      await writePaymentLog("intent-confirm-no-sale", {
        route: req.originalUrl,
        intentId: req.params.id,
        requestedSaleId: saleId || null,
        intent: intentSummary,
      }, PAYMENT_DEBUG_COLLECTION);
      return res.status(404).json({ error: "Matching sale not found for payment intent" });
    }
    if (saleId && sale.id !== saleId) {
      await writePaymentLog("intent-confirm-sale-mismatch", {
        route: req.originalUrl,
        intentId: req.params.id,
        requestedSaleId: saleId,
        matchedSaleId: sale.id,
        intent: intentSummary,
      }, PAYMENT_DEBUG_COLLECTION);
      return res.status(409).json({ error: "Payment intent does not match this sale" });
    }

    const completedSale = await completeSaleForPaidIntent(req.params.id, attrs.amount);
    await writePaymentLog("intent-confirm-completed", {
      route: req.originalUrl,
      intentId: req.params.id,
      requestedSaleId: saleId || null,
      matchedSale: { id: sale.id, status: sale.status, totalPrice: sale.totalPrice },
      completedSale: completedSale ? { id: completedSale.id, status: completedSale.status } : null,
      intent: intentSummary,
    }, PAYMENT_DEBUG_COLLECTION);
    return res.json({ paid: true, status, sale: completedSale });
  } catch (err) {
    await writePaymentLog("intent-confirm-error", {
      route: req.originalUrl,
      intentId: req.params.id,
      requestedSaleId: saleId || null,
      error: safeError(err),
    }, PAYMENT_DEBUG_COLLECTION);
    res.status(err.status || 500).json({ error: err.message || "Payment confirmation failed" });
  }
};

// ─── POST /api/payment/intent/:id/attach ─────────────────────────────
const attachPaymentMethod = async (req, res) => {
  const { payment_method_id, client_key, return_url } = req.body;
  if (!payment_method_id || !client_key) {
    return res.status(400).json({ error: "payment_method_id and client_key are required" });
  }
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
  try {
    const data = await pmFetch("POST", `/payment_intents/${req.params.id}/attach`, {
      data: {
        attributes: {
          payment_method: payment_method_id,
          client_key,
          return_url: return_url || `${frontendUrl}/payment/return`,
        },
      },
    });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json(err.data || { error: "PayMongo error" });
  }
};

// ─── POST /api/payment/method ─────────────────────────────────────────
const createPaymentMethod = async (req, res) => {
  const { type = "gcash", billing = {} } = req.body;
  try {
    res.json(await pmFetch("POST", "/payment_methods", { data: { attributes: { type, billing } } }));
  } catch (err) {
    res.status(err.status || 500).json(err.data || { error: "PayMongo error" });
  }
};

// ─── POST /api/payment/link ───────────────────────────────────────────
const createPaymentLink = async (req, res) => {
  const { amount, description = "DJ Grain Hub Payment", reference_number } = req.body;
  if (!amount || Number(amount) < 1) {
    return res.status(400).json({ error: "amount is required and must be ≥ 1 (PHP)" });
  }
  const centavos = Math.round(Number(amount) * 100);
  const attrs = { amount: centavos, description };
  if (reference_number) attrs.reference_number = reference_number;
  try {
    res.json(await pmFetch("POST", "/links", { data: { attributes: attrs } }));
  } catch (err) {
    res.status(err.status || 500).json(err.data || { error: "PayMongo error" });
  }
};

// ─── GET /api/payment/link/:id ────────────────────────────────────────
const getPaymentLink = async (req, res) => {
  try {
    res.json(await pmFetch("GET", `/links/${req.params.id}`));
  } catch (err) {
    res.status(err.status || 500).json(err.data || { error: "PayMongo error" });
  }
};

// ─── POST /api/payment/webhook ────────────────────────────────────────
const handleWebhook = async (req, res) => {
  const event = req.body;
  const type = event?.data?.attributes?.type ?? "unknown";
  const resource = event?.data?.attributes?.data;
  const intentId = extractIntentIdFromResource(resource);

  await writePaymentLog("webhook-received", {
    route: req.originalUrl,
    method: req.method,
    type,
    intentId,
    hasSignature: Boolean(req.headers["paymongo-signature"]),
    rawBodyType: Buffer.isBuffer(req.rawBody) ? "buffer" : typeof req.rawBody,
    bodyKeys: req.body && typeof req.body === "object" ? Object.keys(req.body) : [],
    payload: event,
  });

  const signature = verifyWebhookSignature(req);
  if (!signature.ok) {
    console.warn(`[PayMongo] ${signature.error} - rejected`);
    await writePaymentLog("webhook-rejected", {
      route: req.originalUrl,
      type,
      intentId,
      reason: signature.error,
      status: signature.status,
      hasSignature: Boolean(req.headers["paymongo-signature"]),
    });
    return res.status(signature.status).json({ error: signature.error });
  }

  console.log(`[PayMongo] Webhook: ${type}`);
  await writePaymentLog("webhook-accepted", {
    route: req.originalUrl,
    type,
    intentId,
  });

  switch (type) {
    case "payment.paid":
    case "payment_intent.succeeded":
    case "payment_intent.payment_paid": {
      const attrs = resource?.attributes || {};
      const paidAmount = attrs.amount;
      if (intentId) {
        try {
          const completedSale = await completeSaleForPaidIntent(intentId, paidAmount);
          await writePaymentLog("webhook-sale-completed", {
            route: req.originalUrl,
            type,
            intentId,
            paidAmount,
            sale: completedSale ? { id: completedSale.id, status: completedSale.status } : null,
          });
        } catch (err) {
          console.error(`  -> Error completing sale for intent ${intentId}:`, err.message);
          await writePaymentLog("webhook-sale-complete-error", {
            route: req.originalUrl,
            type,
            intentId,
            paidAmount,
            error: safeError(err),
          });
        }
      } else {
        await writePaymentLog("webhook-missing-intent", {
          route: req.originalUrl,
          type,
          resourceId: resource?.id || null,
        });
      }
      break;
    }
    case "payment.failed":
    case "payment_intent.payment_failed": {
      if (intentId) {
        try {
          await markSaleFailedForIntent(intentId);
          await writePaymentLog("webhook-sale-failed", {
            route: req.originalUrl,
            type,
            intentId,
          });
        } catch (err) {
          console.error(`  -> Error marking sale failed for intent ${intentId}:`, err.message);
          await writePaymentLog("webhook-sale-fail-error", {
            route: req.originalUrl,
            type,
            intentId,
            error: safeError(err),
          });
        }
      } else {
        await writePaymentLog("webhook-missing-intent", {
          route: req.originalUrl,
          type,
          resourceId: resource?.id || null,
        });
      }
      break;
    }
    case "qrph.expired": {
      if (intentId) {
        try {
          await markSaleFailedForIntent(intentId);
          await writePaymentLog("webhook-qr-expired", {
            route: req.originalUrl,
            type,
            intentId,
          });
        } catch (err) {
          console.error(`  -> Error marking expired QR Ph sale failed for intent ${intentId}:`, err.message);
          await writePaymentLog("webhook-qr-expire-error", {
            route: req.originalUrl,
            type,
            intentId,
            error: safeError(err),
          });
        }
      } else {
        await writePaymentLog("webhook-missing-intent", {
          route: req.originalUrl,
          type,
          resourceId: resource?.id || null,
        });
      }
      break;
    }
    default:
      await writePaymentLog("webhook-unhandled", {
        route: req.originalUrl,
        type,
        intentId,
      });
      console.log(`  ↳ unhandled event type: ${type}`);
  }

  res.status(200).json({ received: true });
};

async function readRecentLogs(collection, limit = 100) {
  const snap = await db.collection(collection)
    .orderBy("createdAtMs", "desc")
    .limit(limit)
    .get();
  return snap.docs.map(docToObj);
}

async function deleteRecentLogs(collection, limit = 200) {
  const snap = await db.collection(collection)
    .orderBy("createdAtMs", "desc")
    .limit(limit)
    .get();
  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  if (!snap.empty) await batch.commit();
  return snap.size;
}

const getWebhookLog = async (_req, res) => {
  try {
    const logs = await readRecentLogs(WEBHOOK_LOG_COLLECTION, 100);
    return res.json(logs);
  } catch (err) {
    console.error("[PaymentDebug] Failed to read webhook logs:", err.message);
    return res.json(webhookLog);
  }
};

const clearWebhookLog = async (_req, res) => {
  webhookLog.length = 0;
  const [webhookDeleted, debugDeleted] = await Promise.all([
    deleteRecentLogs(WEBHOOK_LOG_COLLECTION).catch(() => 0),
    deleteRecentLogs(PAYMENT_DEBUG_COLLECTION).catch(() => 0),
  ]);
  res.json({ cleared: true, webhookDeleted, debugDeleted });
};

const getPaymentDebug = async (req, res) => {
  const intentId = req.params.id;

  try {
    const [intentData, sale, webhookSnap, debugSnap] = await Promise.all([
      pmFetch("GET", `/payment_intents/${intentId}`).catch((err) => ({ error: safeError(err) })),
      findSaleByPaymentIntentId(intentId),
      db.collection(WEBHOOK_LOG_COLLECTION).where("intentId", "==", intentId).limit(100).get(),
      db.collection(PAYMENT_DEBUG_COLLECTION).where("intentId", "==", intentId).limit(100).get(),
    ]);

    const webhookLogs = webhookSnap.docs
      .map(docToObj)
      .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
    const debugLogs = debugSnap.docs
      .map(docToObj)
      .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));

    const response = {
      intentId,
      env: {
        nodeEnv: process.env.NODE_ENV || null,
        hasPayMongoSecretKey: Boolean(process.env.PAYMONGO_SECRET_KEY),
        webhookSecretsCount: getWebhookSecrets().length,
      },
      sale: sale ? { id: sale.id, status: sale.status, totalPrice: sale.totalPrice, paymentIntentId: sale.paymentIntentId } : null,
      intent: intentData?.error ? null : summarizePaymentIntent(intentData),
      rawIntent: intentData,
      webhookLogs,
      debugLogs,
    };

    await writePaymentLog("payment-debug-read", {
      route: req.originalUrl,
      intentId,
      sale: response.sale,
      intent: response.intent,
      webhookLogCount: webhookLogs.length,
      debugLogCount: debugLogs.length,
    }, PAYMENT_DEBUG_COLLECTION);

    return res.json(response);
  } catch (err) {
    await writePaymentLog("payment-debug-error", {
      route: req.originalUrl,
      intentId,
      error: safeError(err),
    }, PAYMENT_DEBUG_COLLECTION);
    return res.status(err.status || 500).json({ error: err.message || "Payment debug failed" });
  }
};

module.exports = {
  createPaymentIntent,
  getPaymentIntent,
  confirmPaymentIntent,
  attachPaymentMethod,
  createPaymentMethod,
  createPaymentLink,
  getPaymentLink,
  handleWebhook,
  getWebhookLog,
  clearWebhookLog,
  getPaymentDebug,
};
