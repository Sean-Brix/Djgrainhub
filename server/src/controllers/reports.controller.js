const { prisma } = require("../lib/prisma");

// ─── Helpers ──────────────────────────────────────────────────────────

function machineFilter(user) {
  if (user.accessRole === "super_admin") return {};
  return user.ownedMachineId ? { machineId: user.ownedMachineId } : { machineId: "NONE" };
}

function canAccessMachine(user, machineId) {
  return user.accessRole === "super_admin" || user.ownedMachineId === machineId;
}

const VALID_CATEGORIES = [
  "Machine Jam",
  "Payment Issue",
  "Product Quality",
  "Display Problem",
  "Other",
];

function isDatabaseUnavailable(error) {
  if (!error) return false;
  if (error.code === "P1001" || error.code === "P2024") return true;
  const msg = String(error.message || "");
  return (
    msg.includes("Can't reach database server") ||
    msg.includes("Error opening a TLS connection") ||
    msg.includes("PrismaClientInitializationError") ||
    msg.includes("root certificate which is not trusted")
  );
}

// ─── GET /api/reports ─────────────────────────────────────────────────
// Returns all reports visible to the user.
// Supports ?status=open|resolved, ?machineId=, ?category=
async function getReports(req, res) {
  try {
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
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return res.status(503).json({ error: "Database is busy right now. Please try again." });
    }
    console.error("[reports.getReports]", error);
    return res.status(500).json({ error: "Failed to load reports" });
  }
}

// ─── GET /api/reports/:id ─────────────────────────────────────────────
async function getReportById(req, res) {
  try {
    const report = await prisma.report.findUnique({
      where: { id: req.params.id },
      include: {
        machine: { select: { id: true, name: true } },
        todoItem: true,
      },
    });

    if (!report) return res.status(404).json({ error: "Report not found" });
    if (!canAccessMachine(req.user, report.machineId)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return res.json(report);
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return res.status(503).json({ error: "Database is busy right now. Please try again." });
    }
    console.error("[reports.getReportById]", error);
    return res.status(500).json({ error: "Failed to load report" });
  }
}

// ─── POST /api/reports ────────────────────────────────────────────────
// Creates a report submitted from the kiosk or admin panel.
// Contact details are required.
async function createReport(req, res) {
  try {
    const {
      machineId,
      category,
      message,
      reporterName,
      reporterMobile,
      name,
      mobileNumber,
    } = req.body;

    const finalReporterName = reporterName ?? name;
    const finalReporterMobile = reporterMobile ?? mobileNumber;
    const trimmedReporterName = typeof finalReporterName === "string" ? finalReporterName.trim() : "";
    const trimmedReporterMobile = typeof finalReporterMobile === "string" ? finalReporterMobile.trim() : "";
    const trimmedMessage = typeof message === "string" ? message.trim() : "";
    const digitCount = (trimmedReporterMobile.match(/\d/g) || []).length;

    if (!machineId || !category || !trimmedMessage || !trimmedReporterName || !trimmedReporterMobile) {
      return res.status(400).json({ error: "machineId, category, message, reporterName, and reporterMobile are required" });
    }

    if (digitCount < 10) {
      return res.status(400).json({ error: "reporterMobile must be a valid mobile number" });
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({
        error: `category must be one of: ${VALID_CATEGORIES.join(", ")}`,
      });
    }

    // Short-circuit unauthorized users before any DB work.
    if (!canAccessMachine(req.user, machineId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const machine = await prisma.machine.findUnique({ where: { id: machineId }, select: { id: true } });
    if (!machine) {
      return res.status(404).json({ error: "Machine not found" });
    }

    const report = await prisma.report.create({
      data: {
        machineId,
        category,
        message: trimmedMessage,
        reporterName: trimmedReporterName,
        reporterMobile: trimmedReporterMobile,
        status: "open",
      },
      include: {
        machine: { select: { id: true, name: true } },
      },
    });

    return res.status(201).json(report);
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return res.status(503).json({ error: "Database is busy right now. Please try again." });
    }
    console.error("[reports.createReport]", error);
    return res.status(500).json({ error: "Failed to submit report" });
  }
}

// ─── PATCH /api/reports/:id/status ───────────────────────────────────
// Changes report status: "open" → "resolved".
async function updateReportStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ["open", "resolved"];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${allowed.join(", ")}` });
    }

    const existing = await prisma.report.findUnique({ where: { id }, select: { id: true, machineId: true } });
    if (!existing) return res.status(404).json({ error: "Report not found" });
    if (!canAccessMachine(req.user, existing.machineId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const report = await prisma.report.update({
      where: { id },
      data: { status },
    });

    return res.json(report);
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return res.status(503).json({ error: "Database is busy right now. Please try again." });
    }
    console.error("[reports.updateReportStatus]", error);
    return res.status(500).json({ error: "Failed to update report status" });
  }
}

module.exports = { getReports, getReportById, createReport, updateReportStatus };
