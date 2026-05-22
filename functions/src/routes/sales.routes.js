const { Router } = require("express");
const { getSales, getSaleById, createSale, completeSale, exportSalesCsv } = require("../controllers/sales.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = Router();
router.use(authenticate);

router.get("/export", exportSalesCsv);
router.get("/", getSales);
router.get("/:id", getSaleById);
router.post("/", createSale);
router.patch("/:id/complete", completeSale);

module.exports = { salesRouter: router };
