const crypto = require("crypto");
const { db } = require("../lib/db");
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

function verifyWebhookSignature(req) {
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!webhookSecret) {
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

  if (typeof req.rawBody !== "string") {
    return { ok: false, status: 400, error: "Raw body unavailable" };
  }

  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${req.rawBody}`)
    .digest("hex");

  if (!timingSafeHexEqual(receivedSig, expected)) {
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
    return;
  }

  await completeSaleById(sale.id);
  console.log(`  -> Sale ${sale.id} confirmed via webhook`);
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
    res.json(await pmFetch("GET", `/payment_intents/${req.params.id}`));
  } catch (err) {
    res.status(err.status || 500).json(err.data || { error: "PayMongo error" });
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
  const signature = verifyWebhookSignature(req);
  if (!signature.ok) {
    console.warn(`[PayMongo] ${signature.error} - rejected`);
    return res.status(signature.status).json({ error: signature.error });
  }

  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (webhookSecret) {
    const sigHeader = req.headers["paymongo-signature"];
    if (!sigHeader) {
      return res.status(400).json({ error: "Missing signature" });
    }
    const parts = Object.fromEntries(sigHeader.split(",").map((p) => p.split("=")));
    const timestamp = parts["t"];
    const receivedSig = parts.li || parts.te;
    const rawBody = typeof req.rawBody === "string" ? req.rawBody : JSON.stringify(req.body);
    const expected = crypto.createHmac("sha256", webhookSecret).update(`${timestamp}.${rawBody}`).digest("hex");
    if (receivedSig !== expected) {
      return res.status(400).json({ error: "Invalid signature" });
    }
  }

  const event = req.body;
  const type = event?.data?.attributes?.type ?? "unknown";
  const timestamp = new Date().toISOString();

  webhookLog.unshift({ timestamp, type, payload: event });
  if (webhookLog.length > 50) webhookLog.length = 50;
  console.log(`[PayMongo] Webhook: ${type} at ${timestamp}`);

  switch (type) {
    case "payment.paid": {
      const intentId = event?.data?.attributes?.data?.attributes?.payment_intent_id;
      const paidAmount = event?.data?.attributes?.data?.attributes?.amount;
      if (intentId) {
        try {
          await completeSaleForPaidIntent(intentId, paidAmount);
        } catch (err) {
          console.error(`  -> Error completing sale for intent ${intentId}:`, err.message);
        }
      }
      break;
    }
    case "payment_intent.succeeded": {
      const intentId = event?.data?.attributes?.data?.id;
      const amount = event?.data?.attributes?.data?.attributes?.amount;
      if (intentId) {
        try {
          await completeSaleForPaidIntent(intentId, amount);
        } catch (err) {
          console.error(`  -> Error completing sale for intent ${intentId}:`, err.message);
        }
      }
      break;
    }
    case "payment.failed": {
      const intentId = event?.data?.attributes?.data?.attributes?.payment_intent_id;
      if (intentId) {
        try {
          await markSaleFailedForIntent(intentId);
        } catch (err) {
          console.error(`  -> Error marking sale failed for intent ${intentId}:`, err.message);
        }
      }
      break;
    }
    case "qrph.expired": {
      const intentId = event?.data?.attributes?.data?.attributes?.payment_intent_id;
      if (intentId) {
        try {
          await markSaleFailedForIntent(intentId);
        } catch (err) {
          console.error(`  -> Error marking expired QR Ph sale failed for intent ${intentId}:`, err.message);
        }
      }
      break;
    }
    default:
      console.log(`  ↳ unhandled event type: ${type}`);
  }

  res.status(200).json({ received: true });
};

const getWebhookLog = (_req, res) => res.json(webhookLog);
const clearWebhookLog = (_req, res) => { webhookLog.length = 0; res.json({ cleared: true }); };

module.exports = {
  createPaymentIntent,
  getPaymentIntent,
  attachPaymentMethod,
  createPaymentMethod,
  createPaymentLink,
  getPaymentLink,
  handleWebhook,
  getWebhookLog,
  clearWebhookLog,
};
