const express = require("express");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");
const { router } = require("./routes");
const { connectMqtt } = require("./lib/mqtt");
const Layer = require("express/lib/router/layer");

dotenv.config();

// Ensure async route/controller rejections flow into Express error middleware.
const originalHandleRequest = Layer.prototype.handle_request;
Layer.prototype.handle_request = function patchedHandleRequest(req, res, next) {
  const fn = this.handle;
  if (fn.length > 3) {
    return originalHandleRequest.call(this, req, res, next);
  }
  try {
    const ret = fn(req, res, next);
    if (ret && typeof ret.then === "function") {
      ret.catch(next);
    }
  } catch (err) {
    next(err);
  }
};

process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});

process.on("uncaughtException", (error) => {
  console.error("[uncaughtException]", error);
});

function isDatabaseUnavailable(err) {
  if (!err) return false;
  if (err.code === "P1001" || err.code === "P2024") return true;
  const msg = String(err.message || "");
  return (
    msg.includes("Can't reach database server") ||
    msg.includes("Error opening a TLS connection") ||
    msg.includes("PrismaClientInitializationError") ||
    msg.includes("root certificate which is not trusted")
  );
}

const app = express();
const PORT = process.env.PORT || 3000;

// In production the React build lives two levels up: <repo>/dist
const DIST_DIR = path.join(__dirname, "..", "..", "dist");

app.use(cors());
app.use(express.json({
  limit: "200kb",
  // Preserve raw body string for PayMongo webhook signature verification
  verify: (req, _res, buf, encoding) => {
    req.rawBody = buf.toString(encoding || "utf8");
  },
}));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api", router);

// ─── Serve React build ───────────────────────────────────────────────────────
// Serves the Vite build output from <repo>/dist whenever it exists.
// In development, run `npm run build` from the repo root first,
// then access the app at http://localhost:3000.
// The Vite dev server (npm run dev) still proxies /api to this port.
const fs = require("fs");
if (fs.existsSync(DIST_DIR)) {

  // ── PWA: correct MIME type for web manifest ──────────────────────────────
  // Chrome requires Content-Type: application/manifest+json on the manifest
  // file or it will refuse to install the PWA.
  app.get("/manifest.webmanifest", (_req, res) => {
    res
      .setHeader("Content-Type", "application/manifest+json")
      .setHeader("Cache-Control", "no-cache")
      .sendFile(path.join(DIST_DIR, "manifest.webmanifest"));
  });

  // ── PWA: service worker needs no-cache + full scope permission ───────────
  // Service-Worker-Allowed: / lets the SW control the entire origin even if
  // it was served from a sub-path.  Cache-Control: no-cache ensures browsers
  // always re-check for a new SW version on every load.
  app.get("/sw.js", (_req, res) => {
    res
      .setHeader("Content-Type", "application/javascript")
      .setHeader("Cache-Control", "no-cache")
      .setHeader("Service-Worker-Allowed", "/")
      .sendFile(path.join(DIST_DIR, "sw.js"));
  });

  // Workbox runtime (must also not be aggressively cached)
  app.get("/workbox-*.js", (req, res) => {
    res
      .setHeader("Content-Type", "application/javascript")
      .setHeader("Cache-Control", "no-cache")
      .sendFile(path.join(DIST_DIR, path.basename(req.path)));
  });

  // Static assets (JS/CSS/images) — long-lived cache with content hash
  app.use(express.static(DIST_DIR, {
    setHeaders(res, filePath) {
      if (filePath.endsWith(".html")) {
        // HTML must never be cached so the app updates reliably
        res.setHeader("Cache-Control", "no-cache");
      }
    },
  }));

  // SPA fallback — send index.html for any non-API route
  app.get("*", (_req, res) => {
    res
      .setHeader("Cache-Control", "no-cache")
      .sendFile(path.join(DIST_DIR, "index.html"));
  });
}

// MQTT
connectMqtt();

// ─── Global error handler ─────────────────────────────────────────────────
// Must be declared AFTER routes so Express treats it as an error middleware.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  if (res.headersSent) {
    return;
  }

  // Prisma / DB connectivity failures should never crash or leak stack traces.
  if (isDatabaseUnavailable(err)) {
    console.warn("[db-unavailable]", err.code || err.name || "unknown");
    return res.status(503).json({
      error: "Database is temporarily unavailable. Please try again.",
    });
  }

  // express body-parser throws this when the request body exceeds the limit
  if (err.type === "entity.too.large" || err.status === 413) {
    return res.status(413).json({
      error:
        "Request body is too large. " +
        "To upload a product image, use multipart/form-data: " +
        "POST /api/products/:id/image  (field name: \"image\", max 5 MB).",
    });
  }

  // Multer file-size limit
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      error: "Image file is too large. Maximum allowed size is 5 MB.",
    });
  }

  // Multer wrong file type
  if (err.message === "Only image files are accepted") {
    return res.status(415).json({ error: err.message });
  }

  console.error(err);
  return res.status(err.status || 500).json({ error: err.message || "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
