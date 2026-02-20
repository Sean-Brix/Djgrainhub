const { Router } = require("express");
const { getPreferences, updatePreferences } = require("../controllers/notifications.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = Router();
router.use(authenticate);

// GET    /api/notifications/preferences   — get current user's notification toggles
// PATCH  /api/notifications/preferences   — update toggles (machineAlerts, stockAlerts, dailySummary)

router.get("/preferences", getPreferences);
router.patch("/preferences", updatePreferences);

module.exports = { notificationsRouter: router };
