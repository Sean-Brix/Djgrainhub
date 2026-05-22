const { Router } = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const {
  createPaymentIntent,
  getPaymentIntent,
  attachPaymentMethod,
  createPaymentMethod,
  createPaymentLink,
  getPaymentLink,
  handleWebhook,
  getWebhookLog,
  clearWebhookLog,
} = require("../controllers/payment.controller");

const paymentRouter = Router();

paymentRouter.post("/intent",            authenticate, createPaymentIntent);
paymentRouter.get("/intent/:id",         authenticate, getPaymentIntent);
paymentRouter.post("/intent/:id/attach", authenticate, attachPaymentMethod);

paymentRouter.post("/method",            authenticate, createPaymentMethod);

paymentRouter.post("/link",              authenticate, createPaymentLink);
paymentRouter.get("/link/:id",           authenticate, getPaymentLink);

// Public — PayMongo calls this
paymentRouter.post("/webhook",           handleWebhook);
paymentRouter.get("/webhook/log",        authenticate, getWebhookLog);
paymentRouter.delete("/webhook/log",     authenticate, clearWebhookLog);

module.exports = { paymentRouter };
