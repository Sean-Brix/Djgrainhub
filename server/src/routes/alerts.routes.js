const { Router } = require("express");
const {
  getAlerts,
  getAlertById,
  updateAlertStatus,
  createAlert,
} = require("../controllers/alerts.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = Router();
router.use(authenticate);

// GET    /api/alerts               — list alerts (?status, ?machineId, ?severity)
// POST   /api/alerts               — manually create alert
// GET    /api/alerts/:id           — single alert
// PATCH  /api/alerts/:id           — update status (active → resolved)

router.get("/", getAlerts);
router.post("/", createAlert);
router.get("/:id", getAlertById);
router.patch("/:id", updateAlertStatus);

module.exports = { alertsRouter: router };
