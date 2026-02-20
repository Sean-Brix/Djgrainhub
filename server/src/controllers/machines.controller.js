const { prisma } = require("../lib/prisma");

// ─── Helpers ─────────────────────────────────────────────────────────

function machineWhereClause(user) {
  if (user.accessRole === "super_admin") return {};
  return user.ownedMachineId ? { id: user.ownedMachineId } : { id: "NONE" };
}

// ─── GET /api/machines ────────────────────────────────────────────────
// Returns all machines visible to the authenticated user,
// with their products included (for stock level calculation).
async function getMachines(req, res) {
  const where = machineWhereClause(req.user);

  const machines = await prisma.machine.findMany({
    where,
    include: {
      products: { orderBy: { slotNumber: "asc" } },
      owner: { select: { id: true, name: true } },
      _count: { select: { alerts: { where: { status: "active" } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  return res.json(machines);
}

// ─── GET /api/machines/:id ────────────────────────────────────────────
// Returns a single machine with full detail: products, recent sales,
// active alerts, and computed stats.
async function getMachineById(req, res) {
  const machine = await prisma.machine.findUnique({
    where: { id: req.params.id },
    include: {
      products: { orderBy: { slotNumber: "asc" } },
      owner: { select: { id: true, name: true } },
      alerts: {
        where: { status: "active" },
        orderBy: { timestamp: "desc" },
      },
      sales: {
        where: { status: "completed" },
        orderBy: { timestamp: "desc" },
        take: 10,
        include: { items: true },
      },
    },
  });

  if (!machine) return res.status(404).json({ error: "Machine not found" });

  // Role guard for admin users
  if (
    req.user.accessRole !== "super_admin" &&
    machine.id !== req.user.ownedMachineId
  ) {
    return res.status(403).json({ error: "Forbidden" });
  }

  return res.json(machine);
}

// ─── POST /api/machines ───────────────────────────────────────────────
// Creates a new machine. super_admin only.
async function createMachine(req, res) {
  if (req.user.accessRole !== "super_admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { name, location, lat, lng, ownerId, status, capacity, lastRefill } = req.body;

  if (!name || !location || !ownerId) {
    return res.status(400).json({ error: "name, location, and ownerId are required" });
  }

  const machine = await prisma.machine.create({
    data: {
      name,
      location,
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
      ownerId,
      status: status || "offline",
      capacity: capacity ? parseInt(capacity) : 100,
      lastRefill: lastRefill ? new Date(lastRefill) : null,
    },
    include: { products: true },
  });

  return res.status(201).json(machine);
}

// ─── PATCH /api/machines/:id ──────────────────────────────────────────
// Updates machine details (name, location, status, etc.).
// Admin can only update their own machine.
async function updateMachine(req, res) {
  const { id } = req.params;

  if (
    req.user.accessRole !== "super_admin" &&
    id !== req.user.ownedMachineId
  ) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { name, location, lat, lng, status, capacity, lastRefill, earnings, alertCount } = req.body;

  const machine = await prisma.machine.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(location !== undefined && { location }),
      ...(lat !== undefined && { lat: parseFloat(lat) }),
      ...(lng !== undefined && { lng: parseFloat(lng) }),
      ...(status !== undefined && { status }),
      ...(capacity !== undefined && { capacity: parseInt(capacity) }),
      ...(lastRefill !== undefined && { lastRefill: new Date(lastRefill) }),
      ...(earnings !== undefined && { earnings: parseFloat(earnings) }),
      ...(alertCount !== undefined && { alertCount: parseInt(alertCount) }),
    },
    include: { products: true },
  });

  return res.json(machine);
}

// ─── DELETE /api/machines/:id ─────────────────────────────────────────
// Deletes a machine and all its products (cascade). super_admin only.
async function deleteMachine(req, res) {
  if (req.user.accessRole !== "super_admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  await prisma.machine.delete({ where: { id: req.params.id } });
  return res.json({ message: "Machine deleted" });
}

module.exports = {
  getMachines,
  getMachineById,
  createMachine,
  updateMachine,
  deleteMachine,
};
