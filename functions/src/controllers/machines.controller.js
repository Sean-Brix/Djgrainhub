const { db, docToObj, docsToArr, now } = require("../lib/db");

function bySlotNumber(a, b) {
  return (a.slotNumber || 0) - (b.slotNumber || 0);
}

function byTimestampDesc(a, b) {
  return new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0);
}

function productsFromSnap(snapshot) {
  return snapshot.docs
    .map((p) => {
      const prod = docToObj(p);
      delete prod.imageBlob;
      return prod;
    })
    .sort(bySlotNumber);
}

// ─── GET /api/machines ────────────────────────────────────────────────
async function getMachines(req, res) {
  let machineDocs;

  if (req.user.accessRole === "super_admin") {
    const snap = await db.collection("machines").orderBy("createdAt", "asc").get();
    machineDocs = snap.docs;
  } else if (req.user.ownedMachineId) {
    const doc = await db.collection("machines").doc(req.user.ownedMachineId).get();
    machineDocs = doc.exists ? [doc] : [];
  } else {
    return res.json([]);
  }

  const machines = await Promise.all(
    machineDocs.map(async (machineDoc) => {
      const machine = docToObj(machineDoc);

      const [productsSnap, ownerDoc, alertCountSnap] = await Promise.all([
        db.collection("products").where("machineId", "==", machine.id).get(),
        machine.ownerId ? db.collection("users").doc(machine.ownerId).get() : Promise.resolve(null),
        db.collection("alerts").where("machineId", "==", machine.id).where("status", "==", "active").count().get(),
      ]);

      machine.products = productsFromSnap(productsSnap);
      machine.owner = ownerDoc && ownerDoc.exists ? { id: ownerDoc.id, name: ownerDoc.data().name } : null;
      machine._count = { alerts: alertCountSnap.data().count };

      return machine;
    })
  );

  return res.json(machines);
}

// ─── GET /api/machines/:id ────────────────────────────────────────────
async function getMachineById(req, res) {
  const doc = await db.collection("machines").doc(req.params.id).get();
  if (!doc.exists) return res.status(404).json({ error: "Machine not found" });

  const machine = docToObj(doc);

  if (req.user.accessRole !== "super_admin" && machine.id !== req.user.ownedMachineId) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const [productsSnap, alertsSnap, salesSnap, ownerDoc] = await Promise.all([
    db.collection("products").where("machineId", "==", machine.id).get(),
    db.collection("alerts").where("machineId", "==", machine.id).where("status", "==", "active").get(),
    db.collection("sales").where("machineId", "==", machine.id).where("status", "==", "completed").get(),
    machine.ownerId ? db.collection("users").doc(machine.ownerId).get() : Promise.resolve(null),
  ]);

  machine.products = productsFromSnap(productsSnap);
  machine.alerts = docsToArr(alertsSnap).sort(byTimestampDesc);
  machine.owner = ownerDoc && ownerDoc.exists ? { id: ownerDoc.id, name: ownerDoc.data().name } : null;

  const recentSales = salesSnap.docs.map(docToObj).sort(byTimestampDesc).slice(0, 10);
  machine.sales = await Promise.all(
    recentSales.map(async (sale) => {
      const itemsSnap = await db.collection("saleItems").where("saleId", "==", sale.id).get();
      sale.items = docsToArr(itemsSnap);
      return sale;
    })
  );

  return res.json(machine);
}

// ─── POST /api/machines ───────────────────────────────────────────────
async function createMachine(req, res) {
  if (req.user.accessRole !== "super_admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { name, location, lat, lng, ownerId, status, capacity, lastRefill } = req.body;
  if (!name || !location || !ownerId) {
    return res.status(400).json({ error: "name, location, and ownerId are required" });
  }

  const ts = now();
  const docRef = await db.collection("machines").add({
    name,
    location,
    lat: lat ? parseFloat(lat) : null,
    lng: lng ? parseFloat(lng) : null,
    ownerId,
    status: status || "offline",
    capacity: capacity ? parseInt(capacity) : 100,
    lastRefill: lastRefill ? new Date(lastRefill).toISOString() : null,
    earnings: 0,
    alertCount: 0,
    createdAt: ts,
    updatedAt: ts,
  });

  const machine = docToObj(await docRef.get());
  machine.products = [];
  return res.status(201).json(machine);
}

// ─── PATCH /api/machines/:id ──────────────────────────────────────────
async function updateMachine(req, res) {
  const { id } = req.params;
  if (req.user.accessRole !== "super_admin" && id !== req.user.ownedMachineId) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { name, location, lat, lng, status, capacity, lastRefill, earnings, alertCount } = req.body;
  const data = { updatedAt: now() };
  if (name !== undefined) data.name = name;
  if (location !== undefined) data.location = location;
  if (lat !== undefined) data.lat = parseFloat(lat);
  if (lng !== undefined) data.lng = parseFloat(lng);
  if (status !== undefined) data.status = status;
  if (capacity !== undefined) data.capacity = parseInt(capacity);
  if (lastRefill !== undefined) data.lastRefill = new Date(lastRefill).toISOString();
  if (earnings !== undefined) data.earnings = parseFloat(earnings);
  if (alertCount !== undefined) data.alertCount = parseInt(alertCount);

  await db.collection("machines").doc(id).update(data);

  const machine = docToObj(await db.collection("machines").doc(id).get());
  const productsSnap = await db.collection("products").where("machineId", "==", id).get();
  machine.products = docsToArr(productsSnap).sort(bySlotNumber);
  return res.json(machine);
}

// ─── DELETE /api/machines/:id ─────────────────────────────────────────
async function deleteMachine(req, res) {
  if (req.user.accessRole !== "super_admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  const { id } = req.params;
  const batch = db.batch();

  // Gather all related docs in parallel
  const [productsSnap, alertsSnap, reportsSnap, eventsSnap, todosSnap, salesSnap] = await Promise.all([
    db.collection("products").where("machineId", "==", id).get(),
    db.collection("alerts").where("machineId", "==", id).get(),
    db.collection("reports").where("machineId", "==", id).get(),
    db.collection("machineEvents").where("machineId", "==", id).get(),
    db.collection("todos").where("machineId", "==", id).get(),
    db.collection("sales").where("machineId", "==", id).get(),
  ]);

  [productsSnap, alertsSnap, reportsSnap, eventsSnap, todosSnap].forEach((snap) =>
    snap.docs.forEach((d) => batch.delete(d.ref))
  );

  // Sales and their items
  const saleIds = salesSnap.docs.map((d) => d.id);
  salesSnap.docs.forEach((d) => batch.delete(d.ref));

  if (saleIds.length > 0) {
    // Firestore 'in' supports up to 30 values per query — chunk if needed
    for (let i = 0; i < saleIds.length; i += 30) {
      const chunk = saleIds.slice(i, i + 30);
      const itemsSnap = await db.collection("saleItems").where("saleId", "in", chunk).get();
      itemsSnap.docs.forEach((d) => batch.delete(d.ref));
    }
  }

  batch.delete(db.collection("machines").doc(id));
  await batch.commit();

  return res.json({ message: "Machine deleted" });
}

module.exports = { getMachines, getMachineById, createMachine, updateMachine, deleteMachine };
