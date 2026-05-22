const { db, admin, docToObj, now } = require("../lib/db");

function byTimestampDesc(a, b) {
  return new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0);
}

function buildQuery(user, filters) {
  let q = db.collection("alerts");
  if (user.accessRole !== "super_admin" && user.ownedMachineId) {
    q = q.where("machineId", "==", user.ownedMachineId);
  } else if (user.accessRole !== "super_admin") {
    return null; // no machines accessible
  }
  if (filters.machineId) q = q.where("machineId", "==", filters.machineId);
  if (filters.status) q = q.where("status", "==", filters.status);
  if (filters.severity) q = q.where("severity", "==", filters.severity);
  return q;
}

// ─── GET /api/alerts ──────────────────────────────────────────────────
async function getAlerts(req, res) {
  const { status, machineId, severity } = req.query;
  const q = buildQuery(req.user, { status, machineId, severity });
  if (!q) return res.json([]);

  const snap = await q.get();
  const alerts = await Promise.all(
    snap.docs.map(async (doc) => {
      const alert = docToObj(doc);
      if (alert.machineId) {
        const mDoc = await db.collection("machines").doc(alert.machineId).get();
        alert.machine = mDoc.exists ? { id: mDoc.id, name: mDoc.data().name } : null;
      }
      return alert;
    })
  );
  return res.json(alerts.sort(byTimestampDesc));
}

// ─── GET /api/alerts/:id ──────────────────────────────────────────────
async function getAlertById(req, res) {
  const doc = await db.collection("alerts").doc(req.params.id).get();
  if (!doc.exists) return res.status(404).json({ error: "Alert not found" });

  const alert = docToObj(doc);
  if (alert.machineId) {
    const mDoc = await db.collection("machines").doc(alert.machineId).get();
    alert.machine = mDoc.exists ? { id: mDoc.id, name: mDoc.data().name } : null;
  }
  return res.json(alert);
}

// ─── PATCH /api/alerts/:id ────────────────────────────────────────────
async function updateAlertStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;

  const allowed = ["active", "resolved"];
  if (!status || !allowed.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${allowed.join(", ")}` });
  }

  const doc = await db.collection("alerts").doc(id).get();
  if (!doc.exists) return res.status(404).json({ error: "Alert not found" });

  const alert = docToObj(doc);
  await db.collection("alerts").doc(id).update({ status, updatedAt: now() });

  if (status === "resolved" && alert.status === "active" && alert.machineId) {
    await db.collection("machines").doc(alert.machineId).update({
      alertCount: admin.firestore.FieldValue.increment(-1),
    });
  }

  return res.json(docToObj(await db.collection("alerts").doc(id).get()));
}

// ─── POST /api/alerts ─────────────────────────────────────────────────
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

  const ts = now();
  const docRef = await db.collection("alerts").add({
    machineId, type, severity, message,
    status: "active",
    timestamp: ts,
    createdAt: ts,
  });

  await db.collection("machines").doc(machineId).update({
    alertCount: admin.firestore.FieldValue.increment(1),
  });

  return res.status(201).json(docToObj(await docRef.get()));
}

module.exports = { getAlerts, getAlertById, updateAlertStatus, createAlert };
