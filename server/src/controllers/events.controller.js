const { prisma } = require("../lib/prisma");

// ─── GET /api/machines/:machineId/events ──────────────────────────────
// Returns paginated MQTT telemetry events for a machine.
// Powers the Live Monitor feed.
// Supports ?type=sale|status|heartbeat|sensor|alert, ?limit=, ?page=
async function getEventsByMachine(req, res) {
  const { machineId } = req.params;
  const { type, limit = 20, page = 1 } = req.query;
  const take = Math.min(parseInt(limit), 100);
  const skip = (parseInt(page) - 1) * take;

  const where = {
    machineId,
    ...(type && { type }),
  };

  const [events, total] = await prisma.$transaction([
    prisma.machineEvent.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take,
      skip,
    }),
    prisma.machineEvent.count({ where }),
  ]);

  return res.json({ events, total, page: parseInt(page), limit: take });
}

// ─── POST /api/machines/:machineId/events ─────────────────────────────
// Manually logs an event (also called internally from the MQTT handler).
async function createEvent(req, res) {
  const { machineId } = req.params;
  const { type, topic, payload } = req.body;

  if (!type || !topic || payload === undefined) {
    return res.status(400).json({ error: "type, topic, and payload are required" });
  }

  const event = await prisma.machineEvent.create({
    data: { machineId, type, topic, payload },
  });

  return res.status(201).json(event);
}

module.exports = { getEventsByMachine, createEvent };
