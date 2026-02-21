const { Router } = require("express");
const multer = require("multer");
const {
  getProductsByMachine,
  createProduct,
  updateProduct,
  deleteProduct,
  decrementStock,
  uploadProductImage,
  getProductImage,
} = require("../controllers/products.controller");
const { authenticate } = require("../middleware/auth.middleware");

// 5 MB limit; images kept in memory (buffer) and written straight to the DB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are accepted"), false);
    }
    cb(null, true);
  },
});

const router = Router();
router.use(authenticate);

// Nested under /api/machines/:machineId/products
// GET    /api/machines/:machineId/products         — list products for machine
// POST   /api/machines/:machineId/products         — add product to slot

// Flat product routes
// PATCH  /api/products/:id                         — update product details
// DELETE /api/products/:id                         — remove product from slot
// PATCH  /api/products/:id/stock                   — decrement stock after dispensing
// POST   /api/products/:id/image                   — upload image blob (multipart, field: "image")
// GET    /api/products/:id/image                   — serve image blob

// (Nested routes are mounted in machines.routes.js via router.use)

const machineProductsRouter = Router({ mergeParams: true });
machineProductsRouter.use(authenticate);
machineProductsRouter.get("/", getProductsByMachine);
machineProductsRouter.post("/", createProduct);

// Standalone product actions
router.patch("/:id", updateProduct);
router.delete("/:id", deleteProduct);
router.patch("/:id/stock", decrementStock);
router.post("/:id/image", upload.single("image"), uploadProductImage);
router.get("/:id/image", getProductImage);

module.exports = { productsRouter: router, machineProductsRouter };
