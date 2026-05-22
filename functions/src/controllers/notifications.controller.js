const { db, docToObj, now } = require("../lib/db");

// Notification prefs are stored in "notificationPrefs" collection,
// keyed by userId as the document ID for O(1) lookup.

// ─── GET /api/notifications/preferences ──────────────────────────────
async function getPreferences(req, res) {
  let doc = await db.collection("notificationPrefs").doc(req.user.sub).get();

  if (!doc.exists) {
    await db.collection("notificationPrefs").doc(req.user.sub).set({
      userId: req.user.sub,
      machineAlerts: true,
      stockAlerts: true,
      dailySummary: false,
      createdAt: now(),
      updatedAt: now(),
    });
    doc = await db.collection("notificationPrefs").doc(req.user.sub).get();
  }

  return res.json(docToObj(doc));
}

// ─── PATCH /api/notifications/preferences ────────────────────────────
async function updatePreferences(req, res) {
  const { machineAlerts, stockAlerts, dailySummary } = req.body;
  const ts = now();

  const data = { userId: req.user.sub, updatedAt: ts };
  if (machineAlerts !== undefined) data.machineAlerts = Boolean(machineAlerts);
  if (stockAlerts !== undefined) data.stockAlerts = Boolean(stockAlerts);
  if (dailySummary !== undefined) data.dailySummary = Boolean(dailySummary);

  await db.collection("notificationPrefs").doc(req.user.sub).set(data, { merge: true });

  const doc = await db.collection("notificationPrefs").doc(req.user.sub).get();
  return res.json(docToObj(doc));
}

module.exports = { getPreferences, updatePreferences };
