const { getMqttClient } = require("../lib/mqtt");
const dispenseBus = require("../lib/dispense-bus");

// ─── In-memory store: latest dispense result per machine ─────────────────────
// keyed by machineId → { slot1..slot6, allOk, receivedAt }
const latestDispenseResult = new Map();

// How long (ms) to wait for the ESP32 to publish a "dispense" confirmation.
const DISPENSE_TIMEOUT_MS = 90_000; // 1.5 minutes

// ─── POST /api/machines/:machineId/order ─────────────────────────────────────
// Body: { slot1: <int>, slot2: <int>, ..., slot6: <int> }
// Publishes to the "order" MQTT topic so the ESP32 knows how many items
// to dispense from each slot, then waits for a "dispense" confirmation.
async function sendOrder(req, res) {
  const { machineId } = req.params;
  const body = req.body || {};

  // ── Validate slot values ─────────────────────────────────────────────
  const slots = {};
  for (let i = 1; i <= 6; i++) {
    const key = `slot${i}`;
    const raw = body[key];
    const val = raw === undefined ? 0 : parseInt(raw, 10);
    if (isNaN(val) || val < 0) {
      return res.status(400).json({
        error: `${key} must be a non-negative integer (got: ${raw})`,
      });
    }
    slots[key] = val;
  }

  const totalItems = Object.values(slots).reduce((s, v) => s + v, 0);
  if (totalItems === 0) {
    return res.status(400).json({ error: "All slots are 0 — nothing to dispense." });
  }

  // ── Publish "order" to the ESP32 ────────────────────────────────────
  // Uses "id" so the ESP32 knows which machine the order is for.
  const orderPayload = JSON.stringify({ id: machineId, ...slots });

  let mqttClient;
  try {
    mqttClient = getMqttClient();
  } catch {
    return res.status(503).json({ error: "MQTT broker not connected. Try again shortly." });
  }

  mqttClient.publish("order", orderPayload, { qos: 1 }, (err) => {
    if (err) {
      console.error("MQTT publish error (order):", err.message);
    } else {
      console.log(`MQTT order published → machine ${machineId}:`, slots);
    }
  });

  // ── Wait for dispense confirmation ──────────────────────────────────
  // The ESP32 should publish to "dispense" after it attempts to dispense.
  // We wait up to DISPENSE_TIMEOUT_MS for the bus to emit the event.
  const confirmation = await new Promise((resolve) => {
    const timer = setTimeout(() => {
      dispenseBus.removeAllListeners(`dispense:${machineId}`);
      resolve(null); // timeout — no confirmation received
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

  // ── Analyse the confirmation ────────────────────────────────────────
  // For slots where ordered qty > 0: confirmed only if slot = true (dispensed OK)
  // For slots where ordered qty = 0: confirmed only if slot = true (nothing moved)
  const slotResults = {};
  let allOk = true;
  for (let i = 1; i <= 6; i++) {
    const key = `slot${i}`;
    const ok = confirmation[key] === true;
    slotResults[key] = { ordered: slots[key], dispensedOk: ok };
    if (!ok) allOk = false;
  }

  // Store latest result so GET /dispense/latest can return it
  latestDispenseResult.set(machineId, {
    ...slotResults,
    allOk,
    receivedAt: new Date().toISOString(),
  });

  return res.json({
    machineId,
    ordered: slots,
    dispenseConfirmation: slotResults,
    allOk,
  });
}

// ─── GET /api/machines/:machineId/dispense/latest ─────────────────────────────
// Returns the most recent dispense confirmation for a machine.
// Useful for the dashboard or after re-loading the page.
function getLatestDispense(req, res) {
  const { machineId } = req.params;
  const result = latestDispenseResult.get(machineId);
  if (!result) {
    return res.status(404).json({ error: "No dispense data yet for this machine." });
  }
  return res.json({ machineId, ...result });
}

module.exports = { sendOrder, getLatestDispense };
