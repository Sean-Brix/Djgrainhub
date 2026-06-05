/**
 * PayMongo Payment Controller
 *
 * Wraps the PayMongo REST API (https://developers.paymongo.com)
 * Uses native fetch (Node 18+). No extra dependencies required.
 *
 * Env vars needed:
 *   PAYMONGO_SECRET_KEY     — sk_test_... or sk_live_...
 *   PAYMONGO_PUBLIC_KEY     — pk_test_... or pk_live_...
 *   PAYMONGO_WEBHOOK_SECRET — whsk_... (from PayMongo Dashboard → Webhooks)
 *   FRONTEND_URL            — e.g. http://localhost:5173
 */

const crypto = require("crypto");
const { prisma } = require("../lib/prisma");
const {
  completeSaleById,
  failSaleByPaymentIntentId,
} = require("./sales.controller");

const PAYMONGO_BASE = "https://api.paymongo.com/v1";

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// In-memory webhook event log (dev/debug only — resets on server restart)
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

async function completeSaleForPaidIntent(intentId, paidAmount) {
  if (!intentId) return;

  const sale = await prisma.sale.findUnique({ where: { paymentIntentId: intentId } });
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

// ─── Payment Intents ─────────────────────────────────────────────────────────

/**
 * POST /api/payment/intent
 * Body: { amount: number (PHP), description: string, payment_method_types?: string[] }
 * Creates a payment intent for the specified amount.
 */
const createPaymentIntent = async (req, res) => {
  const {
    amount,
    description = "DJ Grain Hub Purchase",
    payment_method_types = ["gcash", "paymaya", "card"],
  } = req.body;

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
          payment_method_options: {
            card: { request_three_d_secure: "any" },
          },
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

/**
 * GET /api/payment/intent/:id
 * Returns the current status of a payment intent.
 */
const getPaymentIntent = async (req, res) => {
  try {
    const data = await pmFetch("GET", `/payment_intents/${req.params.id}`);
    if (isPaymentIntentPaid(data)) {
      try {
        await completeSaleForPaidIntent(req.params.id, data?.data?.attributes?.amount);
      } catch (err) {
        console.error(`  -> Error syncing paid intent ${req.params.id}:`, err.message);
      }
    }
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json(err.data || { error: "PayMongo error" });
  }
};

const confirmPaymentIntent = async (req, res) => {
  const { saleId } = req.body || {};

  try {
    const data = await pmFetch("GET", `/payment_intents/${req.params.id}`);
    const attrs = data?.data?.attributes || {};
    const status = attrs.status;

    if (!isPaymentIntentPaid(data)) {
      return res.json({ paid: false, status, intent: data });
    }

    const sale = await prisma.sale.findUnique({ where: { paymentIntentId: req.params.id } });
    if (!sale) {
      return res.status(404).json({ error: "Matching sale not found for payment intent" });
    }
    if (saleId && sale.id !== saleId) {
      return res.status(409).json({ error: "Payment intent does not match this sale" });
    }

    const completedSale = await completeSaleForPaidIntent(req.params.id, attrs.amount);
    return res.json({ paid: true, status, sale: completedSale });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Payment confirmation failed" });
  }
};

/**
 * POST /api/payment/intent/:id/attach
 * Body: { payment_method_id: string, client_key: string, return_url?: string }
 * Attaches a payment method to an existing intent (triggers GCash redirect etc.)
 */
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

// ─── Payment Methods ──────────────────────────────────────────────────────────

/**
 * POST /api/payment/method
 * Body: { type: "gcash"|"paymaya"|"grab_pay", billing?: object }
 * Creates a payment method (step 1 before attaching to an intent).
 */
const createPaymentMethod = async (req, res) => {
  const { type = "gcash", billing = {} } = req.body;

  try {
    const data = await pmFetch("POST", "/payment_methods", {
      data: {
        attributes: {
          type,
          billing,
        },
      },
    });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json(err.data || { error: "PayMongo error" });
  }
};

// ─── Payment Links ────────────────────────────────────────────────────────────

/**
 * POST /api/payment/link
 * Body: { amount: number (PHP), description: string, reference_number?: string }
 * Creates a one-time payment link (easiest integration for kiosk use).
 */
const createPaymentLink = async (req, res) => {
  const { amount, description = "DJ Grain Hub Payment", reference_number } = req.body;

  if (!amount || Number(amount) < 1) {
    return res.status(400).json({ error: "amount is required and must be ≥ 1 (PHP)" });
  }

  const centavos = Math.round(Number(amount) * 100);
  const attrs = { amount: centavos, description };
  if (reference_number) attrs.reference_number = reference_number;

  try {
    const data = await pmFetch("POST", "/links", { data: { attributes: attrs } });
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json(err.data || { error: "PayMongo error" });
  }
};

/**
 * GET /api/payment/link/:id
 * Returns current status and details of a payment link.
 */
const getPaymentLink = async (req, res) => {
  try {
    const data = await pmFetch("GET", `/links/${req.params.id}`);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json(err.data || { error: "PayMongo error" });
  }
};

// ─── Webhooks ─────────────────────────────────────────────────────────────────

/**
 * POST /api/payment/webhook
 * Public endpoint — PayMongo calls this with payment events.
 * Register this URL in your PayMongo dashboard → Webhooks.
 */
const handleWebhook = async (req, res) => {
  const signature = verifyWebhookSignature(req);
  if (!signature.ok) {
    console.warn(`[PayMongo] ${signature.error} - rejected`);
    return res.status(signature.status).json({ error: signature.error });
  }

  // ── Signature verification ────────────────────────────────────────────────
  const webhookSecrets = getWebhookSecrets();
  if (webhookSecrets.length > 0) {
    const sigHeader = req.headers["paymongo-signature"];
    if (!sigHeader) {
      console.warn("[PayMongo] Missing Paymongo-Signature header — rejected");
      return res.status(400).json({ error: "Missing signature" });
    }

    // Header format: "t=<timestamp>,te=<hmac_sha256>"
    const parts = parseSignatureHeader(sigHeader);
    const timestamp = parts["t"];
    const isLiveEvent = req.body?.data?.attributes?.livemode === true;
    const receivedSig = (isLiveEvent ? parts.li : parts.te) || parts.li || parts.te;

    // Payload to sign: "<timestamp>.<raw json body>"
    const rawBody = getRawBodyString(req) || JSON.stringify(req.body);
    const isValid = webhookSecrets.some((secret) => {
      const expected = crypto
        .createHmac("sha256", secret)
        .update(`${timestamp}.${rawBody}`)
        .digest("hex");
      return timingSafeHexEqual(receivedSig, expected);
    });

    if (!isValid) {
      console.warn("[PayMongo] Signature mismatch — rejected");
      return res.status(400).json({ error: "Invalid signature" });
    }
  }

  const event = req.body;
  const type = event?.data?.attributes?.type ?? "unknown";
  const timestamp = new Date().toISOString();

  // Store for dev inspection
  webhookLog.unshift({ timestamp, type, payload: event });
  if (webhookLog.length > 50) webhookLog.length = 50;

  console.log(`[PayMongo] Webhook: ${type} at ${timestamp}`);

  // ── Handle specific event types ──────────────────────────────────────────
  switch (type) {
    case "payment.paid":
    case "payment_intent.succeeded":
    case "payment_intent.payment_paid": {
      const resource = event?.data?.attributes?.data;
      const attrs = resource?.attributes || {};
      const paidAmount = attrs.amount;
      const intentId =
        attrs.payment_intent_id ||
        attrs.payment_intent?.id ||
        (typeof attrs.payment_intent === "string" ? attrs.payment_intent : null) ||
        (String(resource?.id || "").startsWith("pi_") ? resource.id : null);
      console.log(`  -> ${type} - intent:${intentId} amount:${paidAmount} centavos`);

      if (intentId) {
        try {
          await completeSaleForPaidIntent(intentId, paidAmount);
        } catch (err) {
          console.error(`  -> Error completing sale for intent ${intentId}:`, err.message);
        }
      }
      break;
    }
    case "payment.failed":
    case "payment_intent.payment_failed": {
      const resource = event?.data?.attributes?.data;
      const attrs = resource?.attributes || {};
      const intentId =
        attrs.payment_intent_id ||
        attrs.payment_intent?.id ||
        (typeof attrs.payment_intent === "string" ? attrs.payment_intent : null) ||
        (String(resource?.id || "").startsWith("pi_") ? resource.id : null);
      console.log(`  -> ${type} - intent:${intentId}`);

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
      const resource = event?.data?.attributes?.data;
      const attrs = resource?.attributes || {};
      const intentId =
        attrs.payment_intent_id ||
        attrs.payment_intent?.id ||
        (typeof attrs.payment_intent === "string" ? attrs.payment_intent : null) ||
        (String(resource?.id || "").startsWith("pi_") ? resource.id : null);
      console.log(`  -> qrph.expired - intent:${intentId}`);

      if (intentId) {
        try {
          await markSaleFailedForIntent(intentId);
        } catch (err) {
          console.error(`  -> Error marking expired QR Ph sale failed for intent ${intentId}:`, err.message);
        }
      }
      break;
    }
    case "link.payment.paid": {
      const refNumber = event?.data?.attributes?.data?.attributes?.reference_number;
      console.log(`  -> link.payment.paid - ref:${refNumber}`);
      break;
    }
    default:
      console.log(`  -> unhandled event type: ${type}`);
  }

  res.status(200).json({ received: true });
};

/**
 * GET /api/payment/webhook/log
 * Returns the last 50 webhook events (dev only — clears on restart).
 */
const getWebhookLog = (_req, res) => {
  res.json(webhookLog);
};

/**
 * DELETE /api/payment/webhook/log
 * Clears the in-memory webhook log.
 */
const clearWebhookLog = (_req, res) => {
  webhookLog.length = 0;
  res.json({ cleared: true });
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
};
