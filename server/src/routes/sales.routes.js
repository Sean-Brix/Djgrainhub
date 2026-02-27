const { Router } = require("express");
const { getSales, getSaleById, createSale, completeSale, exportSalesCsv } = require("../controllers/sales.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = Router();
router.use(authenticate);

// GET    /api/sales                — paginated transaction list (?status, ?machineId, ?limit, ?page)
// GET    /api/sales/export         — download CSV of all transactions
// GET    /api/sales/:id            — single transaction detail
// POST   /api/sales                — create sale from kiosk checkout (status: pending)
// PATCH  /api/sales/:id/complete   — mark pending sale as completed (kiosk fallback)

router.get("/export", exportSalesCsv); // must be before /:id
router.get("/", getSales);
router.get("/:id", getSaleById);
router.post("/", createSale);
router.patch("/:id/complete", completeSale);

module.exports = { salesRouter: router };
