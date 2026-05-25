const { Router } = require("express");
const {
  getSales,
  getSaleById,
  createSale,
  completeSale,
  failSale,
  exportSalesCsv,
} = require("../controllers/sales.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = Router();
router.use(authenticate);

// GET    /api/sales                — paginated transaction list (?status, ?machineId, ?limit, ?page)
// GET    /api/sales/export         — download CSV of all transactions
// GET    /api/sales/:id            — single transaction detail
// POST   /api/sales                — create completed sale after confirmed payment
// PATCH  /api/sales/:id/complete   — legacy/manual completion endpoint
// PATCH  /api/sales/:id/fail       — mark a pending payment sale as failed

router.get("/export", exportSalesCsv); // must be before /:id
router.get("/", getSales);
router.get("/:id", getSaleById);
router.post("/", createSale);
router.patch("/:id/complete", completeSale);
router.patch("/:id/fail", failSale);

module.exports = { salesRouter: router };
