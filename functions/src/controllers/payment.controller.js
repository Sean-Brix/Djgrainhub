const crypto = require("crypto");
const { db } = require("../lib/db");
const { completeSaleById } = require("./sales.controller");

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
      if (intentId) {
        try {
          const snap = await db.collection("sales").where("paymentIntentId", "==", intentId).limit(1).get();
          if (!snap.empty) {
            await completeSaleById(snap.docs[0].id);
            console.log(`  ↳ Sale ${snap.docs[0].id} confirmed via webhook`);
          } else {
            console.warn(`  ↳ No sale found for intentId: ${intentId}`);
          }
        } catch (err) {
          console.error(`  ↳ Error completing sale for intent ${intentId}:`, err.message);
        }
      }
      break;
    }
    case "payment.failed": {
      const intentId = event?.data?.attributes?.data?.attributes?.payment_intent_id;
      if (intentId) {
        try {
          const snap = await db.collection("sales")
            .where("paymentIntentId", "==", intentId)
            .where("status", "==", "pending")
            .get();
          const batch = db.batch();
          snap.docs.forEach((d) => batch.update(d.ref, { status: "failed" }));
          await batch.commit();
        } catch (err) {
          console.error(`  ↳ Error marking sale failed for intent ${intentId}:`, err.message);
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
