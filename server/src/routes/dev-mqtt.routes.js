const { Router } = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const {
  publishMessage,
  simulateDispense,
  getMessages,
  clearMessages,
} = require("../controllers/dev-mqtt.controller");

const router = Router();
router.use(authenticate);

// POST   /api/dev/mqtt/publish             — publish any message to any topic
// POST   /api/dev/mqtt/simulate-dispense   — fake an ESP32 dispense confirmation
// GET    /api/dev/mqtt/messages            — last N received messages (?limit)
// DELETE /api/dev/mqtt/messages            — clear the message log

router.post("/publish", publishMessage);
router.post("/simulate-dispense", simulateDispense);
router.get("/messages", getMessages);
router.delete("/messages", clearMessages);

module.exports = { devMqttRouter: router };
