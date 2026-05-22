const { db, docToObj, now } = require("../lib/db");

function byTimestampDesc(a, b) {
  return new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0);
}

// ─── GET /api/machines/:machineId/events ──────────────────────────────
async function getEventsByMachine(req, res) {
  const { machineId } = req.params;
  const { type, limit = 20, page = 1 } = req.query;
  const take = Math.min(parseInt(limit), 100);
  const skip = (parseInt(page) - 1) * take;

  let q = db.collection("machineEvents").where("machineId", "==", machineId);
  if (type) q = q.where("type", "==", type);

  const allSnap = await q.get();
  const total = allSnap.size;
  const events = allSnap.docs.map(docToObj).sort(byTimestampDesc).slice(skip, skip + take);

  return res.json({ events, total, page: parseInt(page), limit: take });
}

// ─── POST /api/machines/:machineId/events ─────────────────────────────
async function createEvent(req, res) {
  const { machineId } = req.params;
  const { type, topic, payload } = req.body;

  if (!type || !topic || payload === undefined) {
    return res.status(400).json({ error: "type, topic, and payload are required" });
  }

  const ts = now();
  const docRef = await db.collection("machineEvents").add({
    machineId, type, topic, payload,
    timestamp: ts,
    createdAt: ts,
  });

  return res.status(201).json(docToObj(await docRef.get()));
}

module.exports = { getEventsByMachine, createEvent };
