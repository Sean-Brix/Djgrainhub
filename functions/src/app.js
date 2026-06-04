const express = require("express");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");
const { router } = require("./routes");
const Layer = require("express/lib/router/layer");

dotenv.config({ path: path.join(__dirname, "../.env") });

// Patch async route errors into Express error middleware
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

const app = express();

app.use(cors({ origin: true }));
app.use(
  express.json({
    limit: "200kb",
    verify: (req, _res, buf, encoding) => {
      req.rawBody = buf.toString(encoding || "utf8");
    },
  })
);
app.use(express.urlencoded({ extended: false, limit: "20kb" }));

// API routes
app.use("/api", router);

// Global error handler — must be after routes
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  if (res.headersSent) return;

  if (err.type === "entity.too.large" || err.status === 413) {
    return res.status(413).json({
      error:
        "Request body is too large. " +
        "To upload a product image, use multipart/form-data: " +
        'POST /api/products/:id/image  (field name: "image", max 5 MB).',
    });
  }
  if (err.code === "LIMIT_FILE_SIZE") {
    return res
      .status(413)
      .json({ error: "Image file is too large. Maximum allowed size is 5 MB." });
  }
  if (err.message === "Only image files are accepted") {
    return res.status(415).json({ error: err.message });
  }

  console.error(err);
  return res
    .status(err.status || 500)
    .json({ error: err.message || "Internal server error" });
});

module.exports = app;
