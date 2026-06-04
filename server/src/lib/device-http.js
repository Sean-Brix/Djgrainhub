const http = require("http");
const https = require("https");

const DEFAULT_DEVICE_ORDER_URL = "https://phsolutions.tech/iotsystem/update.php";
const REQUEST_TIMEOUT_MS = 15_000;

function buildOrderValue(slots) {
  return Array.from({ length: 6 }, (_, index) => {
    const value = Number(slots[`slot${index + 1}`] || 0);
    return Number.isFinite(value) ? value : 0;
  }).join(",");
}

function buildDeviceOrderUrl(slots) {
  const endpoint = process.env.DEVICE_ORDER_URL || DEFAULT_DEVICE_ORDER_URL;
  const url = new URL(endpoint);
  const value = buildOrderValue(slots);
  url.searchParams.set("value", value);
  return { url, value };
}

function sendDeviceOrder(slots) {
  const { url, value } = buildDeviceOrderUrl(slots);
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
            resolve({ statusCode, body, value, url: url.toString() });
            return;
          }

          const error = new Error(`Device HTTP order failed with status ${statusCode}`);
          error.statusCode = statusCode;
          error.body = body;
          reject(error);
        });
      }
    );

    req.setTimeout(REQUEST_TIMEOUT_MS, () => {
      req.destroy(new Error(`Device HTTP order timed out after ${REQUEST_TIMEOUT_MS / 1000}s`));
    });

    req.on("error", reject);
    req.end();
  });
}

module.exports = { buildOrderValue, sendDeviceOrder };
