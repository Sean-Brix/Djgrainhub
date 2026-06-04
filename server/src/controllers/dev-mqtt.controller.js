const { getMqttClient } = require("../lib/mqtt");
const dispenseBus = require("../lib/dispense-bus");
const messageLog = require("../lib/message-log");

// ─── POST /api/dev/mqtt/publish ───────────────────────────────────────────────
// Publishes any payload to any MQTT topic.
// Body: { topic: string, payload: string | object, qos?: 0|1|2 }
function publishMessage(req, res) {
  const { topic, payload, qos = 1 } = req.body;

  if (!topic) return res.status(400).json({ error: "topic is required" });
  if (payload === undefined) return res.status(400).json({ error: "payload is required" });

  let mqttClient;
  try {
    mqttClient = getMqttClient();
  } catch {
    return res.status(503).json({ error: "MQTT broker not connected" });
  }

  const raw =
    typeof payload === "object" ? JSON.stringify(payload) : String(payload);

  mqttClient.publish(topic, raw, { qos: parseInt(qos) || 1 }, (err) => {
    if (err) {
      console.error(`MQTT dev-publish error (${topic}):`, err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log(`DEV MQTT publish → ${topic}:`, raw);
    return res.json({ topic, payload: raw, qos });
  });
}

// ─── POST /api/dev/mqtt/simulate-dispense ─────────────────────────────────────
// Injects a fake "dispense" confirmation directly onto the dispense bus
// WITHOUT going through MQTT. Useful for testing the kiosk flow without
// a physical vending machine.
// Body: { machineId, slot1..slot6: true|false }
function simulateDispense(req, res) {
  const body = req.body || {};
  const { machineId } = body;

  if (!machineId) {
    return res.status(400).json({ error: "machineId is required" });
  }

  const slots = {};
  for (let i = 1; i <= 6; i++) {
    const key = `slot${i}`;
    // Default to true (success) if not specified
    slots[key] = body[key] !== undefined ? Boolean(body[key]) : true;
  }

  const payload = slots;

  // Also log it so the monitor shows it
  messageLog.push("dispense (simulated)", payload);
  console.log(`DEV simulate-dispense for machine ${machineId}:`, slots);

  // Emit on the bus — the key is still keyed by machineId internally
  dispenseBus.emit(`dispense:${machineId}`, payload);

  return res.json({ simulated: true, payload });
}

// ─── GET /api/dev/mqtt/messages ───────────────────────────────────────────────
// Returns the most recent MQTT messages captured by the server.
// Query params: ?limit=50
function getMessages(req, res) {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  return res.json(messageLog.getRecent(limit));
}

// ─── DELETE /api/dev/mqtt/messages ────────────────────────────────────────────
// Clears the in-memory message log.
function clearMessages(_req, res) {
  messageLog.clear();
  return res.json({ cleared: true });
}

module.exports = { publishMessage, simulateDispense, getMessages, clearMessages };
