const { Router } = require("express");
const { authenticate } = require("../middleware/auth.middleware");
const { publishMessage, simulateDispense, getMessages, clearMessages } = require("../controllers/dev-mqtt.controller");

const router = Router();
router.use(authenticate);

router.post("/publish", publishMessage);
router.post("/simulate-dispense", simulateDispense);
router.get("/messages", getMessages);
router.delete("/messages", clearMessages);

module.exports = { devMqttRouter: router };
