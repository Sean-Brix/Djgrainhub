const express = require("express");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");
const { router } = require("./routes");
const { connectMqtt } = require("./lib/mqtt");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// In production the React build lives two levels up: <repo>/dist
const DIST_DIR = path.join(__dirname, "..", "..", "dist");

app.use(cors());
app.use(express.json({ limit: "200kb" }));

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use("/api", router);

// ─── Serve React build ───────────────────────────────────────────────────────
// Serves the Vite build output from <repo>/dist whenever it exists.
// In development, run `npm run build` from the repo root first,
// then access the app at http://localhost:3000.
// The Vite dev server (npm run dev) still proxies /api to this port.
const fs = require("fs");
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));

  // SPA fallback — send index.html for any non-API route
  app.get("*", (_req, res) => {
    res.sendFile(path.join(DIST_DIR, "index.html"));
  });
}

// MQTT
connectMqtt();

// ─── Global error handler ─────────────────────────────────────────────────
// Must be declared AFTER routes so Express treats it as an error middleware.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
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
