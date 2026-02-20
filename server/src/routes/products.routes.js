const { Router } = require("express");
const {
  getProductsByMachine,
  createProduct,
  updateProduct,
  deleteProduct,
  decrementStock,
} = require("../controllers/products.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = Router();
router.use(authenticate);

// Nested under /api/machines/:machineId/products
// GET    /api/machines/:machineId/products         — list products for machine
// POST   /api/machines/:machineId/products         — add product to slot

// Flat product routes
// PATCH  /api/products/:id                         — update product details
// DELETE /api/products/:id                         — remove product from slot
// PATCH  /api/products/:id/stock                   — decrement stock after dispensing

// (Nested routes are mounted in machines.routes.js via router.use)

const machineProductsRouter = Router({ mergeParams: true });
machineProductsRouter.use(authenticate);
machineProductsRouter.get("/", getProductsByMachine);
machineProductsRouter.post("/", createProduct);

// Standalone product actions
router.patch("/:id", updateProduct);
router.delete("/:id", deleteProduct);
router.patch("/:id/stock", decrementStock);

module.exports = { productsRouter: router, machineProductsRouter };
