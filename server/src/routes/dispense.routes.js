const { Router } = require("express");
const { sendOrder, getLatestDispense } = require("../controllers/dispense.controller");
const { authenticate } = require("../middleware/auth.middleware");

// All dispense routes are nested under /api/machines/:machineId
// mergeParams: true so :machineId is available inside the controller.
const router = Router({ mergeParams: true });
router.use(authenticate);

// POST  /api/machines/:machineId/order           — publish order to ESP32, await confirmation
// GET   /api/machines/:machineId/dispense/latest — last stored dispense result

router.post("/order", sendOrder);
router.get("/dispense/latest", getLatestDispense);

module.exports = { dispenseRouter: router };
