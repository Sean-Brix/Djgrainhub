const { db, docToObj } = require("../lib/db");

function isSuperAdmin(user) {
  return user.accessRole === "super_admin";
}

function byTimestampDesc(a, b) {
  return new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0);
}

async function getMachineIds(user) {
  if (isSuperAdmin(user)) {
    const snap = await db.collection("machines").get();
    return snap.docs.map((d) => d.id);
  }
  return user.ownedMachineId ? [user.ownedMachineId] : [];
}

// ─── GET /api/dashboard/stats ─────────────────────────────────────────
async function getStats(req, res) {
  const machineIds = await getMachineIds(req.user);
  if (machineIds.length === 0) {
    return res.json({ totalRevenue: 0, activeMachines: 0, totalMachines: 0, totalStockKg: 0, activeAlerts: 0 });
  }

  // Fetch machines with products, completed sales, and active alert count in parallel
  const [machineSnaps, salesSnaps, alertSnaps] = await Promise.all([
    Promise.all(machineIds.map((id) => db.collection("machines").doc(id).get())),
    Promise.all(
      machineIds.map((id) =>
        db.collection("sales").where("machineId", "==", id).where("status", "==", "completed").get()
      )
    ),
    Promise.all(
      machineIds.map((id) =>
        db.collection("alerts").where("machineId", "==", id).where("status", "==", "active").count().get()
      )
    ),
  ]);

  const machines = machineSnaps.filter((d) => d.exists).map(docToObj);
  const productSnaps = await Promise.all(
    machines.map((m) => db.collection("products").where("machineId", "==", m.id).get())
  );

  const totalRevenue = salesSnaps.flat().reduce(
    (sum, snap) => sum + snap.docs.reduce((s, d) => s + (d.data().totalPrice || 0), 0),
    0
  );
  const activeMachines = machines.filter((m) => m.status === "online").length;
  const totalStockKg = productSnaps.reduce((sum, snap) => {
    return sum + snap.docs.reduce((ps, d) => ps + (d.data().stock || 0) * (d.data().weight || 0), 0);
  }, 0);
  const activeAlerts = alertSnaps.reduce((sum, snap) => sum + snap.data().count, 0);

  return res.json({
    totalRevenue,
    activeMachines,
    totalMachines: machines.length,
    totalStockKg: Math.round(totalStockKg * 100) / 100,
    activeAlerts,
  });
}

// ─── GET /api/dashboard/revenue-chart ────────────────────────────────
async function getRevenueChart(req, res) {
  const { from, to } = req.query;
  const machineIds = await getMachineIds(req.user);
  if (machineIds.length === 0) return res.json([]);

  const machineDocs = await Promise.all(machineIds.map((id) => db.collection("machines").doc(id).get()));
  const machines = machineDocs.filter((d) => d.exists).map((d) => ({ id: d.id, name: d.data().name }));

  const revenueByMachine = await Promise.all(
    machines.map(async (m) => {
      let q = db.collection("sales").where("machineId", "==", m.id).where("status", "==", "completed");
      const snap = await q.get();
      const sales = snap.docs.map(docToObj).filter((sale) => {
        if (from && sale.timestamp < from) return false;
        if (to && sale.timestamp > to) return false;
        return true;
      });
      const revenue = sales.reduce((sum, sale) => sum + (sale.totalPrice || 0), 0);
      const shortName = m.name.replace("Machine ", "M").split(" - ")[0];
      return { id: m.id, name: shortName, fullName: m.name, revenue };
    })
  );

  return res.json(revenueByMachine.sort((a, b) => b.revenue - a.revenue));
}

// ─── GET /api/dashboard/product-mix ──────────────────────────────────
async function getProductMix(req, res) {
  const machineIds = await getMachineIds(req.user);
  if (machineIds.length === 0) return res.json([]);

  // Get all completed sales for these machines
  const salesSnaps = await Promise.all(
    machineIds.map((id) =>
      db.collection("sales").where("machineId", "==", id).where("status", "==", "completed").get()
    )
  );
  const saleIds = salesSnaps.flatMap((snap) => snap.docs.map((d) => d.id));
  if (saleIds.length === 0) return res.json([]);

  // Fetch sale items in chunks (Firestore 'in' limit is 30)
  let allItems = [];
  for (let i = 0; i < saleIds.length; i += 30) {
    const chunk = saleIds.slice(i, i + 30);
    const snap = await db.collection("saleItems").where("saleId", "in", chunk).get();
    allItems = allItems.concat(snap.docs.map((d) => d.data()));
  }

  // Resolve product names
  const productIds = [...new Set(allItems.map((i) => i.productId).filter(Boolean))];
  const productDocs = await Promise.all(productIds.map((id) => db.collection("products").doc(id).get()));
  const productNames = Object.fromEntries(
    productDocs.filter((d) => d.exists).map((d) => [d.id, d.data().name])
  );

  const map = {};
  for (const item of allItems) {
    const name = productNames[item.productId] || "Unknown";
    map[name] = (map[name] || 0) + (item.quantity || 0);
  }

  return res.json(
    Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  );
}

// ─── GET /api/dashboard/recent-transactions ───────────────────────────
async function getRecentTransactions(req, res) {
  const machineIds = await getMachineIds(req.user);
  if (machineIds.length === 0) return res.json([]);

  // Fetch recent completed sales across all machines
  const snaps = await Promise.all(
    machineIds.map((id) =>
      db
        .collection("sales")
        .where("machineId", "==", id)
        .where("status", "==", "completed")
        .get()
    )
  );

  const allSales = snaps
    .flatMap((snap) => snap.docs.map(docToObj))
    .sort(byTimestampDesc)
    .slice(0, 5);

  const sales = await Promise.all(
    allSales.map(async (sale) => {
      if (sale.machineId) {
        const mDoc = await db.collection("machines").doc(sale.machineId).get();
        sale.machine = mDoc.exists ? { id: mDoc.id, name: mDoc.data().name } : null;
      }
      const itemsSnap = await db.collection("saleItems").where("saleId", "==", sale.id).get();
      sale.items = await Promise.all(
        itemsSnap.docs.map(async (iDoc) => {
          const item = docToObj(iDoc);
          const pDoc = await db.collection("products").doc(item.productId).get();
          item.product = pDoc.exists ? { name: pDoc.data().name } : null;
          return item;
        })
      );
      return sale;
    })
  );

  return res.json(sales);
}

// ─── GET /api/dashboard/low-stock ────────────────────────────────────
async function getLowStockMachines(req, res) {
  const machineIds = await getMachineIds(req.user);
  if (machineIds.length === 0) return res.json([]);

  const machines = await Promise.all(
    machineIds.map(async (id) => {
      const mDoc = await db.collection("machines").doc(id).get();
      if (!mDoc.exists) return null;
      const machine = docToObj(mDoc);
      const productsSnap = await db
        .collection("products")
        .where("machineId", "==", id)
        .get();
      machine.products = productsSnap.docs.map((d) => ({
        stock: d.data().stock,
        weight: d.data().weight,
        name: d.data().name,
        slotNumber: d.data().slotNumber,
      }));
      return machine;
    })
  );

  const lowStock = machines.filter((m) => {
    if (!m) return false;
    const totalStock = m.products.reduce((s, p) => s + (p.stock || 0), 0);
    const capacity = m.capacity || m.products.length * 20;
    return capacity > 0 && totalStock / capacity < 0.25;
  });

  return res.json(lowStock);
}

module.exports = { getStats, getRevenueChart, getProductMix, getRecentTransactions, getLowStockMachines };
