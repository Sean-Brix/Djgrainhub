const http = require("http");
const https = require("https");

const DEFAULT_DEVICE_ORDER_URL = "https://ardevcore.site/iotsystem/update.php";
const DEFAULT_DEVICE_STATUS_URL = "https://ardevcore.site/iotsystem/vendo.php";
const REQUEST_TIMEOUT_MS = 15_000;
const DISPENSE_POLL_INTERVAL_MS = 2_000;

function buildOrderValue(slots) {
  return Array.from({ length: 6 }, (_, index) => {
    const value = Number(slots[`slot${index + 1}`] || 0);
    return Number.isFinite(value) ? value : 0;
  }).join(",");
}

function buildDeviceOrderUrl(slots) {
  const endpoint = process.env.DEVICE_ORDER_URL || DEFAULT_DEVICE_ORDER_URL;
  const baseUrl = new URL(endpoint);
  const value = buildOrderValue(slots);

  baseUrl.searchParams.delete("value");
  const base = baseUrl.toString();
  const separator = baseUrl.search ? "&" : "?";

  return { url: new URL(`${base}${separator}value=${value}`), value };
}

function requestText(url, timeoutMs = REQUEST_TIMEOUT_MS) {
  const client = url.protocol === "http:" ? http : https;

  return new Promise((resolve, reject) => {
    const req = client.request(
      url,
      {
        method: "GET",
        headers: {
          "User-Agent": "DjGrainHub/1.0",
        },
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => {
          if (body.length < 4096) body += chunk;
        });
        res.on("end", () => {
          const statusCode = res.statusCode || 0;
          if (statusCode >= 200 && statusCode < 300) {
            resolve({ statusCode, body });
            return;
          }

          const error = new Error(`Device HTTP request failed with status ${statusCode}`);
          error.statusCode = statusCode;
          error.body = body;
          reject(error);
        });
      }
    );

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Device HTTP request timed out after ${timeoutMs / 1000}s`));
    });

    req.on("error", reject);
    req.end();
  });
}

function sendDeviceOrder(slots) {
  const { url, value } = buildDeviceOrderUrl(slots);

  return requestText(url).then(({ statusCode, body }) => ({
    statusCode,
    body,
    value,
    url: url.toString(),
  }));
}

function parseDeviceStatus(body) {
  const values = String(body || "")
    .trim()
    .split(",")
    .map((value) => value.trim().toLowerCase());

  const slots = {};
  for (let i = 1; i <= 6; i++) {
    slots[`slot${i}`] = values[i - 1] === "true" || values[i - 1] === "1";
  }

  return slots;
}

function orderedSlotsAreDispensed(orderedSlots, statusSlots) {
  return Object.entries(orderedSlots).every(([key, quantity]) => {
    if (quantity <= 0) return true;
    return statusSlots[key] === true;
  });
}

async function getDeviceDispenseStatus() {
  const url = new URL(process.env.DEVICE_STATUS_URL || DEFAULT_DEVICE_STATUS_URL);
  const { statusCode, body } = await requestText(url);
  return {
    statusCode,
    body,
    slots: parseDeviceStatus(body),
    url: url.toString(),
  };
}

async function pollDeviceDispenseStatus(orderedSlots, timeoutMs) {
  const startedAt = Date.now();
  let lastStatus = null;
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      lastStatus = await getDeviceDispenseStatus();
      lastError = null;

      if (orderedSlotsAreDispensed(orderedSlots, lastStatus.slots)) {
        return {
          completed: true,
          status: lastStatus.slots,
          raw: lastStatus.body,
        };
      }
    } catch (err) {
      lastError = err;
    }

    await new Promise((resolve) => setTimeout(resolve, DISPENSE_POLL_INTERVAL_MS));
  }

  return {
    completed: false,
    status: lastStatus ? lastStatus.slots : null,
    raw: lastStatus ? lastStatus.body : null,
    error: lastError ? lastError.message : null,
  };
}

module.exports = {
  buildOrderValue,
  parseDeviceStatus,
  sendDeviceOrder,
  pollDeviceDispenseStatus,
};
