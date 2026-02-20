const { prisma } = require("../lib/prisma");

// ─── Helpers ──────────────────────────────────────────────────────────

function machineFilter(user) {
  if (user.accessRole === "super_admin") return {};
  return user.ownedMachineId ? { machineId: user.ownedMachineId } : { machineId: "NONE" };
}

// ─── GET /api/alerts ──────────────────────────────────────────────────
// Returns alerts for the user's visible machines.
// Supports ?status=active|resolved, ?machineId=, ?severity=
async function getAlerts(req, res) {
  const { status, machineId, severity } = req.query;

  const where = {
    ...machineFilter(req.user),
    ...(status && { status }),
    ...(machineId && { machineId }),
    ...(severity && { severity }),
  };

  const alerts = await prisma.alert.findMany({
    where,
    include: {
      machine: { select: { id: true, name: true } },
    },
    orderBy: { timestamp: "desc" },
  });

  return res.json(alerts);
}

// ─── GET /api/alerts/:id ──────────────────────────────────────────────
async function getAlertById(req, res) {
  const alert = await prisma.alert.findUnique({
    where: { id: req.params.id },
    include: { machine: { select: { id: true, name: true } } },
  });

  if (!alert) return res.status(404).json({ error: "Alert not found" });
  return res.json(alert);
}

// ─── PATCH /api/alerts/:id ────────────────────────────────────────────
// Updates alert status: "active" → "resolved".
// Also decrements machine alertCount when resolving.
async function updateAlertStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  const allowed = ["active", "resolved"];
  if (!status || !allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowed.join(", ")}` });
  }

  const alert = await prisma.alert.findUnique({ where: { id } });
  if (!alert) return res.status(404).json({ error: "Alert not found" });

  const updated = await prisma.alert.update({
    where: { id },
    data: { status },
  });

  // Keep machine alertCount in sync when resolving
  if (status === "resolved" && alert.status === "active") {
    await prisma.machine.update({
      where: { id: alert.machineId },
      data: { alertCount: { decrement: 1 } },
    });
  }

  return res.json(updated);
}

// ─── POST /api/alerts ─────────────────────────────────────────────────
// Manually creates an alert (or called internally from MQTT handler).
async function createAlert(req, res) {
  const { machineId, type, severity, message } = req.body;

  const allowed = {
    type: ["stock", "connection", "maintenance"],
    severity: ["critical", "high", "medium", "low"],
  };

  if (!machineId || !type || !severity || !message) {
    return res.status(400).json({ error: "machineId, type, severity, and message are required" });
  }

  if (!allowed.type.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${allowed.type.join(", ")}` });
  }

  if (!allowed.severity.includes(severity)) {
    return res.status(400).json({ error: `severity must be one of: ${allowed.severity.join(", ")}` });
  }

  const alert = await prisma.alert.create({
    data: { machineId, type, severity, message, status: "active" },
  });

  await prisma.machine.update({
    where: { id: machineId },
    data: { alertCount: { increment: 1 } },
  });

  return res.status(201).json(alert);
}

module.exports = { getAlerts, getAlertById, updateAlertStatus, createAlert };
