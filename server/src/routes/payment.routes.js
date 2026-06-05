const { Router } = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const {
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
} = require("../controllers/payment.controller");

const paymentRouter = Router();

// ─── Payment Intents ──────────────────────────────────────────────────────────
paymentRouter.post("/intent",              authenticate, createPaymentIntent);
paymentRouter.get("/intent/:id",           authenticate, getPaymentIntent);
paymentRouter.post("/intent/:id/confirm",  authenticate, confirmPaymentIntent);
paymentRouter.post("/intent/:id/attach",   authenticate, attachPaymentMethod);

// ─── Payment Methods ──────────────────────────────────────────────────────────
paymentRouter.post("/method",              authenticate, createPaymentMethod);

// ─── Payment Links ────────────────────────────────────────────────────────────
paymentRouter.post("/link",                authenticate, createPaymentLink);
paymentRouter.get("/link/:id",             authenticate, getPaymentLink);

// ─── Webhooks (public — no auth, PayMongo calls this) ─────────────────────────
paymentRouter.post("/webhook",             handleWebhook);
paymentRouter.get("/webhook/log",          authenticate, getWebhookLog);
paymentRouter.delete("/webhook/log",       authenticate, clearWebhookLog);

module.exports = { paymentRouter };
