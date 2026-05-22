const { Router } = require("express");
const { getPreferences, updatePreferences } = require("../controllers/notifications.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = Router();
router.use(authenticate);

router.get("/preferences", getPreferences);
router.patch("/preferences", updatePreferences);

module.exports = { notificationsRouter: router };
