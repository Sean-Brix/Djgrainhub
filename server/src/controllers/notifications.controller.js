const { prisma } = require("../lib/prisma");

// ─── GET /api/notifications/preferences ──────────────────────────────
// Returns the notification preferences for the current user.
// Creates default prefs if they don't exist yet.
async function getPreferences(req, res) {
  let prefs = await prisma.notificationPreference.findUnique({
    where: { userId: req.user.sub },
  });

  if (!prefs) {
    prefs = await prisma.notificationPreference.create({
      data: {
        userId: req.user.sub,
        machineAlerts: true,
        stockAlerts: true,
        dailySummary: false,
      },
    });
  }

  return res.json(prefs);
}

// ─── PATCH /api/notifications/preferences ────────────────────────────
// Updates notification toggle settings for the current user.
// Accepts any combination of: machineAlerts, stockAlerts, dailySummary
async function updatePreferences(req, res) {
  const { machineAlerts, stockAlerts, dailySummary } = req.body;

  const prefs = await prisma.notificationPreference.upsert({
    where: { userId: req.user.sub },
    create: {
      userId: req.user.sub,
      machineAlerts: machineAlerts ?? true,
      stockAlerts: stockAlerts ?? true,
      dailySummary: dailySummary ?? false,
    },
    update: {
      ...(machineAlerts !== undefined && { machineAlerts: Boolean(machineAlerts) }),
      ...(stockAlerts !== undefined && { stockAlerts: Boolean(stockAlerts) }),
      ...(dailySummary !== undefined && { dailySummary: Boolean(dailySummary) }),
    },
  });

  return res.json(prefs);
}

module.exports = { getPreferences, updatePreferences };
