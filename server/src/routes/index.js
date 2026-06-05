const { Router } = require("express");
const { authRouter } = require("./auth.routes");
const { machinesRouter } = require("./machines.routes");
const { productsRouter, machineProductsRouter } = require("./products.routes");
const { salesRouter } = require("./sales.routes");
const { alertsRouter } = require("./alerts.routes");
const { reportsRouter } = require("./reports.routes");
const { todosRouter } = require("./todos.routes");
const { usersRouter } = require("./users.routes");
const { notificationsRouter } = require("./notifications.routes");
const { dashboardRouter } = require("./dashboard.routes");
const { eventsRouter } = require("./events.routes");
const { paymentRouter } = require("./payment.routes");
const { dispenseRouter } = require("./dispense.routes");
const { devMqttRouter } = require("./dev-mqtt.routes");

const router = Router();

// ─── Health check ─────────────────────────────────────────────────────
router.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Auth ─────────────────────────────────────────────────────────────
router.use("/auth", authRouter);

// ─── Machines (with nested products + events + dispense) ──────────────
router.use("/machines/:machineId/products", machineProductsRouter);
router.use("/machines/:machineId/events", eventsRouter);
router.use("/machines/:machineId", dispenseRouter);
router.use("/machines", machinesRouter);

// ─── Products (standalone update/delete/stock) ────────────────────────
router.use("/products", productsRouter);

// ─── Sales ────────────────────────────────────────────────────────────
router.use("/sales", salesRouter);

// ─── Alerts ───────────────────────────────────────────────────────────
router.use("/alerts", alertsRouter);

// ─── Reports ──────────────────────────────────────────────────────────
router.use("/reports", reportsRouter);

// ─── Todos ────────────────────────────────────────────────────────────
router.use("/todos", todosRouter);

// ─── Users (super_admin only) ─────────────────────────────────────────
router.use("/users", usersRouter);

// ─── Notification preferences ─────────────────────────────────────────
router.use("/notifications", notificationsRouter);

// ─── Dashboard aggregates ─────────────────────────────────────────────
router.use("/dashboard", dashboardRouter);

// ─── Payments (PayMongo) ──────────────────────────────────────────────
router.use("/payment", paymentRouter);
router.use("/payments", paymentRouter);

// ─── Dev tools ────────────────────────────────────────────────────────
router.use("/dev/mqtt", devMqttRouter);

module.exports = { router };
