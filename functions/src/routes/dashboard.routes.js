const { Router } = require("express");
const { getStats, getRevenueChart, getProductMix, getRecentTransactions, getLowStockMachines } = require("../controllers/dashboard.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = Router();
router.use(authenticate);

router.get("/stats", getStats);
router.get("/revenue-chart", getRevenueChart);
router.get("/product-mix", getProductMix);
router.get("/recent-transactions", getRecentTransactions);
router.get("/low-stock", getLowStockMachines);

module.exports = { dashboardRouter: router };
