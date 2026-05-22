const { Router } = require("express");
const { getAlerts, getAlertById, updateAlertStatus, createAlert } = require("../controllers/alerts.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = Router();
router.use(authenticate);

router.get("/", getAlerts);
router.post("/", createAlert);
router.get("/:id", getAlertById);
router.patch("/:id", updateAlertStatus);

module.exports = { alertsRouter: router };
