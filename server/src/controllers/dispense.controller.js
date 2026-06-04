const dispenseBus = require("../lib/dispense-bus");
const messageLog = require("../lib/message-log");
const { sendDeviceOrder } = require("../lib/device-http");

const latestDispenseResult = new Map();
const DISPENSE_TIMEOUT_MS = 90_000;

function readOrderSlots(body) {
  const slots = {};

  for (let i = 1; i <= 6; i++) {
    const key = `slot${i}`;
    const raw = body[key];
    const val = raw === undefined ? 0 : parseInt(raw, 10);

    if (isNaN(val) || val < 0) {
      return { error: `${key} must be a non-negative integer (got: ${raw})` };
    }

    slots[key] = val;
  }

  return { slots };
}

function parseBooleanSlot(raw, key) {
  if (raw === undefined) return false;
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "number" && (raw === 0 || raw === 1)) return raw === 1;

  if (typeof raw === "string") {
    const value = raw.trim().toLowerCase();
    if (value === "true" || value === "1") return true;
    if (value === "false" || value === "0") return false;
  }

  throw new Error(`${key} must be a boolean value`);
}

function readConfirmationSlots(input) {
  const slots = {};

  for (let i = 1; i <= 6; i++) {
    const key = `slot${i}`;
    slots[key] = parseBooleanSlot(input[key], key);
  }

  return slots;
}

function createDispenseWait(machineId) {
  const eventName = `dispense:${machineId}`;
  let timer = null;
  let settled = false;
  let resolvePromise;

  const promise = new Promise((resolve) => {
    resolvePromise = resolve;
  });

  function finish(payload) {
    if (settled) return;
    settled = true;
    if (timer) clearTimeout(timer);
    dispenseBus.removeListener(eventName, onDispense);
    resolvePromise(payload);
  }

  function onDispense(payload) {
    finish(payload);
  }

  dispenseBus.once(eventName, onDispense);

  return {
    promise,
    startTimer() {
      if (settled || timer) return;
      timer = setTimeout(() => finish(null), DISPENSE_TIMEOUT_MS);
    },
    cancel() {
      finish(null);
    },
  };
}

async function sendOrder(req, res) {
  const { machineId } = req.params;
  const { slots, error } = readOrderSlots(req.body || {});

  if (error) {
    return res.status(400).json({ error });
  }

  const totalItems = Object.values(slots).reduce((sum, value) => sum + value, 0);
  if (totalItems === 0) {
    return res.status(400).json({ error: "All slots are 0 - nothing to dispense." });
  }

  const wait = createDispenseWait(machineId);

  try {
    const orderResult = await sendDeviceOrder(slots);
    messageLog.push("order", { value: orderResult.value, ...slots });
    console.log(`HTTP order sent to machine ${machineId}: value=${orderResult.value}`);
  } catch (err) {
    wait.cancel();
    console.error("HTTP order error:", err.message);
    return res.status(502).json({
      error: "Could not send order to the machine over HTTP. Try again shortly.",
      ordered: slots,
    });
  }

  wait.startTimer();
  const confirmation = await wait.promise;

  if (!confirmation) {
    return res.status(504).json({
      error: `No dispense confirmation received from machine ${machineId} within ${DISPENSE_TIMEOUT_MS / 1000}s. The order was sent - check the machine manually.`,
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

function receiveDispenseConfirmation(req, res) {
  const { machineId } = req.params;
  const input = Object.keys(req.body || {}).length > 0 ? req.body : req.query;
  let slots;

  try {
    slots = readConfirmationSlots(input || {});
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  messageLog.push("dispense", slots);
  console.log(`HTTP dispense confirmation received for machine ${machineId}:`, slots);
  dispenseBus.emit(`dispense:${machineId}`, slots);

  return res.json({ received: true, machineId, payload: slots });
}

function getLatestDispense(req, res) {
  const { machineId } = req.params;
  const result = latestDispenseResult.get(machineId);

  if (!result) {
    return res.status(404).json({ error: "No dispense data yet for this machine." });
  }

  return res.json({ machineId, ...result });
}

module.exports = { sendOrder, receiveDispenseConfirmation, getLatestDispense };
