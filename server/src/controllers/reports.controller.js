const { prisma } = require("../lib/prisma");

// ─── Helpers ──────────────────────────────────────────────────────────

function machineFilter(user) {
  if (user.accessRole === "super_admin") return {};
  return user.ownedMachineId ? { machineId: user.ownedMachineId } : { machineId: "NONE" };
}

const VALID_CATEGORIES = [
  "Machine Jam",
  "Payment Issue",
  "Product Quality",
  "Display Problem",
  "Other",
];

// ─── GET /api/reports ─────────────────────────────────────────────────
// Returns all reports visible to the user.
// Supports ?status=open|resolved, ?machineId=, ?category=
async function getReports(req, res) {
  const { status, machineId, category } = req.query;

  const where = {
    ...machineFilter(req.user),
    ...(status && { status }),
    ...(machineId && { machineId }),
    ...(category && { category }),
  };

  const reports = await prisma.report.findMany({
    where,
    include: {
      machine: { select: { id: true, name: true } },
      todoItem: true,
    },
    orderBy: { timestamp: "desc" },
  });

  return res.json(reports);
}

// ─── GET /api/reports/:id ─────────────────────────────────────────────
async function getReportById(req, res) {
  const report = await prisma.report.findUnique({
    where: { id: req.params.id },
    include: {
      machine: { select: { id: true, name: true } },
      todoItem: true,
    },
  });

  if (!report) return res.status(404).json({ error: "Report not found" });
  return res.json(report);
}

// ─── POST /api/reports ────────────────────────────────────────────────
// Creates a report submitted from the kiosk or admin panel.
// reporterName and reporterMobile are optional (anonymous allowed).
async function createReport(req, res) {
  const { machineId, category, message, reporterName, reporterMobile } = req.body;

  if (!machineId || !category || !message) {
    return res.status(400).json({ error: "machineId, category, and message are required" });
  }

  if (!VALID_CATEGORIES.includes(category)) {
    return res.status(400).json({
      error: `category must be one of: ${VALID_CATEGORIES.join(", ")}`,
    });
  }

  const report = await prisma.report.create({
    data: {
      machineId,
      category,
      message,
      reporterName: reporterName || null,
      reporterMobile: reporterMobile || null,
      status: "open",
    },
    include: {
      machine: { select: { id: true, name: true } },
    },
  });

  return res.status(201).json(report);
}

// ─── PATCH /api/reports/:id/status ───────────────────────────────────
// Changes report status: "open" → "resolved".
async function updateReportStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  const allowed = ["open", "resolved"];
  if (!status || !allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowed.join(", ")}` });
  }

  const report = await prisma.report.update({
    where: { id },
    data: { status },
  });

  return res.json(report);
}

module.exports = { getReports, getReportById, createReport, updateReportStatus };
