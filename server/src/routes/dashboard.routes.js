const { Router } = require("express");
const {
  getStats,
  getRevenueChart,
  getProductMix,
  getRecentTransactions,
  getLowStockMachines,
} = require("../controllers/dashboard.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = Router();
router.use(authenticate);

// GET    /api/dashboard/stats                — 4 KPI cards (revenue, machines, stock, alerts)
// GET    /api/dashboard/revenue-chart        — revenue per machine (?from, ?to)
// GET    /api/dashboard/product-mix          — sales quantity per product name
// GET    /api/dashboard/recent-transactions  — 5 most recent completed sales
// GET    /api/dashboard/low-stock            — machines with stock < 25%

router.get("/stats", getStats);
router.get("/revenue-chart", getRevenueChart);
router.get("/product-mix", getProductMix);
router.get("/recent-transactions", getRecentTransactions);
router.get("/low-stock", getLowStockMachines);

module.exports = { dashboardRouter: router };
