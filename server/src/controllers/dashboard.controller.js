const { prisma } = require("../lib/prisma");

// ─── Helpers ──────────────────────────────────────────────────────────

function machineWhere(user) {
  if (user.accessRole === "super_admin") return {};
  return user.ownedMachineId ? { id: user.ownedMachineId } : { id: "NONE" };
}

function salesWhere(user) {
  if (user.accessRole === "super_admin") return { status: "completed" };
  return user.ownedMachineId
    ? { machineId: user.ownedMachineId, status: "completed" }
    : { machineId: "NONE", status: "completed" };
}

// ─── GET /api/dashboard/stats ─────────────────────────────────────────
// Returns the 4 KPI cards:
//   totalRevenue, activeMachines/totalMachines, totalStockKg, activeAlerts
async function getStats(req, res) {
  const machineWhere_ = machineWhere(req.user);

  const [machines, completedSales, activeAlerts] = await prisma.$transaction([
    prisma.machine.findMany({
      where: machineWhere_,
      include: { products: { select: { stock: true, weight: true } } },
    }),
    prisma.sale.findMany({
      where: salesWhere(req.user),
      select: { totalPrice: true },
    }),
    prisma.alert.count({
      where: {
        status: "active",
        ...(req.user.accessRole !== "super_admin" && req.user.ownedMachineId
          ? { machineId: req.user.ownedMachineId }
          : {}),
      },
    }),
  ]);

  const totalRevenue = completedSales.reduce((s, sale) => s + sale.totalPrice, 0);
  const activeMachines = machines.filter((m) => m.status === "online").length;
  const totalStockKg = machines.reduce((sum, m) => {
    return sum + m.products.reduce((ps, p) => ps + p.stock * p.weight, 0);
  }, 0);

  return res.json({
    totalRevenue,
    activeMachines,
    totalMachines: machines.length,
    totalStockKg: Math.round(totalStockKg * 100) / 100,
    activeAlerts,
  });
}

// ─── GET /api/dashboard/revenue-chart ────────────────────────────────
// Returns revenue per machine for the bar chart.
// Optionally scope to a date range: ?from=ISO&to=ISO
async function getRevenueChart(req, res) {
  const { from, to } = req.query;
  const machineWhere_ = machineWhere(req.user);

  const machines = await prisma.machine.findMany({
    where: machineWhere_,
    select: { id: true, name: true },
  });

  const machineIds = machines.map((m) => m.id);

  const salesWhere_ = {
    machineId: { in: machineIds },
    status: "completed",
    ...(from || to
      ? {
          timestamp: {
            ...(from && { gte: new Date(from) }),
            ...(to && { lte: new Date(to) }),
          },
        }
      : {}),
  };

  const sales = await prisma.sale.findMany({
    where: salesWhere_,
    select: { machineId: true, totalPrice: true },
  });

  const revenueByMachine = machines.map((m) => {
    const revenue = sales
      .filter((s) => s.machineId === m.id)
      .reduce((sum, s) => sum + s.totalPrice, 0);
    const shortName = m.name.replace("Machine ", "M").split(" - ")[0];
    return { id: m.id, name: shortName, fullName: m.name, revenue };
  });

  return res.json(revenueByMachine.sort((a, b) => b.revenue - a.revenue));
}

// ─── GET /api/dashboard/product-mix ──────────────────────────────────
// Returns units sold per product for the pie/donut chart.
async function getProductMix(req, res) {
  const machineWhere_ = machineWhere(req.user);
  const machines = await prisma.machine.findMany({
    where: machineWhere_,
    select: { id: true },
  });
  const machineIds = machines.map((m) => m.id);

  const saleItems = await prisma.saleItem.findMany({
    where: {
      sale: {
        machineId: { in: machineIds },
        status: "completed",
      },
    },
    include: {
      product: { select: { name: true } },
    },
  });

  // Aggregate by product name
  const map = {};
  for (const item of saleItems) {
    const name = item.product?.name || "Unknown";
    map[name] = (map[name] || 0) + item.quantity;
  }

  const result = Object.entries(map)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return res.json(result);
}

// ─── GET /api/dashboard/recent-transactions ───────────────────────────
// Returns the 5 most recent completed sales for the Recent Activity card.
async function getRecentTransactions(req, res) {
  const where = salesWhere(req.user);

  const sales = await prisma.sale.findMany({
    where,
    include: {
      machine: { select: { id: true, name: true } },
      items: {
        include: { product: { select: { name: true } } },
      },
    },
    orderBy: { timestamp: "desc" },
    take: 5,
  });

  return res.json(sales);
}

// ─── GET /api/dashboard/low-stock ────────────────────────────────────
// Returns machines whose computed stock level is below 25%.
async function getLowStockMachines(req, res) {
  const machineWhere_ = machineWhere(req.user);

  const machines = await prisma.machine.findMany({
    where: machineWhere_,
    include: { products: { select: { stock: true, weight: true, name: true, slotNumber: true } } },
  });

  const lowStock = machines.filter((m) => {
    const totalStock = m.products.reduce((s, p) => s + p.stock, 0);
    const capacity = m.capacity || m.products.length * 20;
    return capacity > 0 && totalStock / capacity < 0.25;
  });

  return res.json(lowStock);
}

module.exports = {
  getStats,
  getRevenueChart,
  getProductMix,
  getRecentTransactions,
  getLowStockMachines,
};
