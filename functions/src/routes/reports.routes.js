const { Router } = require("express");
const { getReports, getReportById, createReport, updateReportStatus } = require("../controllers/reports.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = Router();
router.use(authenticate);

router.get("/", getReports);
router.post("/", createReport);
router.get("/:id", getReportById);
router.patch("/:id/status", updateReportStatus);

module.exports = { reportsRouter: router };
