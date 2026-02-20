const { Router } = require("express");
const {
  getReports,
  getReportById,
  createReport,
  updateReportStatus,
} = require("../controllers/reports.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = Router();
router.use(authenticate);

// GET    /api/reports              — list reports (?status, ?machineId, ?category)
// POST   /api/reports              — submit report from kiosk or admin
// GET    /api/reports/:id          — single report with todo
// PATCH  /api/reports/:id/status   — open → resolved

router.get("/", getReports);
router.post("/", createReport);
router.get("/:id", getReportById);
router.patch("/:id/status", updateReportStatus);

module.exports = { reportsRouter: router };
