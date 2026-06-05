const messageLog = require("../lib/message-log");
const { sendDeviceOrder, pollDeviceDispenseStatus } = require("../lib/device-http");

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

  try {
    const orderResult = await sendDeviceOrder(slots);
    messageLog.push("order", { value: orderResult.value, ...slots });
    console.log(`HTTP order sent to machine ${machineId}: ${orderResult.url}`);
  } catch (err) {
    console.error("HTTP order error:", err.message);
    return res.status(502).json({
      error: "Could not send order to the machine over HTTP. Try again shortly.",
      ordered: slots,
    });
  }

  const confirmation = await pollDeviceDispenseStatus(slots, DISPENSE_TIMEOUT_MS);
  if (!confirmation.completed) {
    return res.status(504).json({
      error: `Ordered slots were not confirmed as dispensed within ${DISPENSE_TIMEOUT_MS / 1000}s. The order was sent - check the machine manually.`,
      ordered: slots,
      latestStatus: confirmation.status,
    });
  }

  messageLog.push("dispense", {
    raw: confirmation.raw,
    ...confirmation.status,
  });

  const slotResults = {};
  let allOk = true;

  for (let i = 1; i <= 6; i++) {
    const key = `slot${i}`;
    const ordered = slots[key];
    const ok = ordered > 0 ? confirmation.status[key] === true : true;
    slotResults[key] = { ordered, dispensedOk: ok };
    if (ordered > 0 && !ok) allOk = false;
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

function getLatestDispense(req, res) {
  const { machineId } = req.params;
  const result = latestDispenseResult.get(machineId);

  if (!result) {
    return res.status(404).json({ error: "No dispense data yet for this machine." });
  }

  return res.json({ machineId, ...result });
}

module.exports = { sendOrder, getLatestDispense };
