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
const { completeSaleById } = require("./sales.controller");

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
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json(err.data || { error: "PayMongo error" });
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
  // ── Signature verification ────────────────────────────────────────────────
  const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (webhookSecret) {
    const sigHeader = req.headers["paymongo-signature"];
    if (!sigHeader) {
      console.warn("[PayMongo] Missing Paymongo-Signature header — rejected");
      return res.status(400).json({ error: "Missing signature" });
    }

    // Header format: "t=<timestamp>,te=<hmac_sha256>"
    const parts = Object.fromEntries(sigHeader.split(",").map((p) => p.split("=")));
    const timestamp = parts["t"];
    const receivedSig = parts["te"];

    // Payload to sign: "<timestamp>.<raw json body>"
    const rawBody = typeof req.rawBody === "string" ? req.rawBody : JSON.stringify(req.body);
    const expected = crypto
      .createHmac("sha256", webhookSecret)
      .update(`${timestamp}.${rawBody}`)
      .digest("hex");

    if (receivedSig !== expected) {
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
    case "payment.paid": {
      const paymentId   = event?.data?.attributes?.data?.id;
      const paidAmount  = event?.data?.attributes?.data?.attributes?.amount;
      const intentId    = event?.data?.attributes?.data?.attributes?.payment_intent_id;
      console.log(`  ↳ payment.paid — id:${paymentId} intent:${intentId} amount:${paidAmount} centavos`);

      if (intentId) {
        try {
          // Find the pending sale that was created when the QR was generated
          const sale = await prisma.sale.findUnique({ where: { paymentIntentId: intentId } });
          if (sale) {
            await completeSaleById(sale.id);
            console.log(`  ↳ Sale ${sale.id} marked completed via webhook`);
          } else {
            console.warn(`  ↳ No pending sale found for intentId: ${intentId}`);
          }
        } catch (err) {
          console.error(`  ↳ Error completing sale for intent ${intentId}:`, err.message);
        }
      }
      break;
    }
    case "payment.failed": {
      const intentId = event?.data?.attributes?.data?.attributes?.payment_intent_id;
      console.log(`  ↳ payment.failed — intent:${intentId}`);

      if (intentId) {
        try {
          await prisma.sale.updateMany({
            where: { paymentIntentId: intentId, status: "pending" },
            data:  { status: "failed" },
          });
          console.log(`  ↳ Sale for intent ${intentId} marked failed`);
        } catch (err) {
          console.error(`  ↳ Error marking sale failed for intent ${intentId}:`, err.message);
        }
      }
      break;
    }
    case "link.payment.paid": {
      const refNumber = event?.data?.attributes?.data?.attributes?.reference_number;
      console.log(`  ↳ link.payment.paid — ref:${refNumber}`);
      break;
    }
    default:
      console.log(`  ↳ unhandled event type: ${type}`);
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
  attachPaymentMethod,
  createPaymentMethod,
  createPaymentLink,
  getPaymentLink,
  handleWebhook,
  getWebhookLog,
  clearWebhookLog,
};
