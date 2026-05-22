const { getMqttClient } = require("../lib/mqtt");
const dispenseBus = require("../lib/dispense-bus");
const { db, now } = require("../lib/db");

// Latest dispense result per machine — persisted in Firestore so it survives
// across function instances. Also cached in-memory for the common case.
const latestCache = new Map();

const DISPENSE_TIMEOUT_MS = 90_000; // 1.5 minutes

// ─── POST /api/machines/:machineId/order ─────────────────────────────────────
async function sendOrder(req, res) {
  const { machineId } = req.params;
  const body = req.body || {};

  const slots = {};
  for (let i = 1; i <= 6; i++) {
    const key = `slot${i}`;
    const raw = body[key];
    const val = raw === undefined ? 0 : parseInt(raw, 10);
    if (isNaN(val) || val < 0) {
      return res.status(400).json({ error: `${key} must be a non-negative integer (got: ${raw})` });
    }
    slots[key] = val;
  }

  const totalItems = Object.values(slots).reduce((s, v) => s + v, 0);
  if (totalItems === 0) {
    return res.status(400).json({ error: "All slots are 0 — nothing to dispense." });
  }

  const orderPayload = JSON.stringify({ id: machineId, ...slots });

  let mqttClient;
  try {
    mqttClient = getMqttClient();
  } catch {
    return res.status(503).json({ error: "MQTT broker not connected. Try again shortly." });
  }

  mqttClient.publish("order", orderPayload, { qos: 1 }, (err) => {
    if (err) console.error("MQTT publish error (order):", err.message);
    else console.log(`MQTT order published → machine ${machineId}:`, slots);
  });

  // Wait for dispense confirmation from ESP32
  const confirmation = await new Promise((resolve) => {
    const timer = setTimeout(() => {
      dispenseBus.removeAllListeners(`dispense:${machineId}`);
      resolve(null);
    }, DISPENSE_TIMEOUT_MS);

    dispenseBus.once(`dispense:${machineId}`, (payload) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });

  if (!confirmation) {
    return res.status(504).json({
      error: `No dispense confirmation received from machine ${machineId} within ${DISPENSE_TIMEOUT_MS / 1000}s. The order was sent — check the machine manually.`,
      ordered: slots,
    });
  }

  const slotResults = {};
  let allOk = true;
  for (let i = 1; i <= 6; i++) {
    const key = `slot${i}`;
    const ok = confirmation[key] === true;
    slotResults[key] = { ordered: slots[key], dispensedOk: ok };
    if (!ok) allOk = false;
  }

  const result = { ...slotResults, allOk, receivedAt: now() };

  // Persist result so GET /dispense/latest works across instances
  latestCache.set(machineId, result);
  db.collection("dispenseResults").doc(machineId).set(result).catch((e) =>
    console.error("[dispense] failed to persist result:", e.message)
  );

  return res.json({ machineId, ordered: slots, dispenseConfirmation: slotResults, allOk });
}

// ─── GET /api/machines/:machineId/dispense/latest ─────────────────────────────
async function getLatestDispense(req, res) {
  const { machineId } = req.params;

  // Check in-memory cache first
  if (latestCache.has(machineId)) {
    return res.json({ machineId, ...latestCache.get(machineId) });
  }

  // Fall back to Firestore
  const doc = await db.collection("dispenseResults").doc(machineId).get();
  if (!doc.exists) {
    return res.status(404).json({ error: "No dispense data yet for this machine." });
  }

  return res.json({ machineId, ...doc.data() });
}

module.exports = { sendOrder, getLatestDispense };
