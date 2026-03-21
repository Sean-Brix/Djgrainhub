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

const asyncRoute = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

// GET    /api/reports              — list reports (?status, ?machineId, ?category)
// POST   /api/reports              — submit report from kiosk or admin
// GET    /api/reports/:id          — single report with todo
// PATCH  /api/reports/:id/status   — open → resolved

router.get("/", asyncRoute(getReports));
router.post("/", asyncRoute(createReport));
router.get("/:id", asyncRoute(getReportById));
router.patch("/:id/status", asyncRoute(updateReportStatus));

module.exports = { reportsRouter: router };
