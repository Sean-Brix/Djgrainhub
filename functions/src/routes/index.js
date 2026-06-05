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

router.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

router.use("/auth", authRouter);

router.use("/machines/:machineId/products", machineProductsRouter);
router.use("/machines/:machineId/events", eventsRouter);
router.use("/machines/:machineId", dispenseRouter);
router.use("/machines", machinesRouter);

router.use("/products", productsRouter);
router.use("/sales", salesRouter);
router.use("/alerts", alertsRouter);
router.use("/reports", reportsRouter);
router.use("/todos", todosRouter);
router.use("/users", usersRouter);
router.use("/notifications", notificationsRouter);
router.use("/dashboard", dashboardRouter);
router.use("/payment", paymentRouter);
router.use("/payments", paymentRouter);
router.use("/dev/mqtt", devMqttRouter);

module.exports = { router };
