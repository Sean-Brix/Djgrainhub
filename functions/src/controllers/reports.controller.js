const { db, docToObj, now } = require("../lib/db");

const VALID_CATEGORIES = ["Machine Jam", "Payment Issue", "Product Quality", "Display Problem", "Other"];

function byTimestampDesc(a, b) {
  return new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0);
}

function canAccessMachine(user, machineId) {
  return user.accessRole === "super_admin" || user.ownedMachineId === machineId;
}

// ─── GET /api/reports ─────────────────────────────────────────────────
async function getReports(req, res) {
  try {
    const { status, machineId, category } = req.query;

    let q = db.collection("reports");
    if (req.user.accessRole !== "super_admin" && req.user.ownedMachineId) {
      q = db.collection("reports").where("machineId", "==", req.user.ownedMachineId);
    } else if (req.user.accessRole !== "super_admin") {
      return res.json([]);
    }
    if (machineId) q = q.where("machineId", "==", machineId);
    if (status) q = q.where("status", "==", status);
    if (category) q = q.where("category", "==", category);

    const snap = await q.get();

    const reports = await Promise.all(
      snap.docs.map(async (doc) => {
        const report = docToObj(doc);
        if (report.machineId) {
          const mDoc = await db.collection("machines").doc(report.machineId).get();
          report.machine = mDoc.exists ? { id: mDoc.id, name: mDoc.data().name } : null;
        }
        const todoSnap = await db.collection("todos").where("reportId", "==", report.id).limit(1).get();
        report.todoItem = todoSnap.empty ? null : docToObj(todoSnap.docs[0]);
        return report;
      })
    );

    return res.json(reports.sort(byTimestampDesc));
  } catch (error) {
    console.error("[reports.getReports]", error);
    return res.status(500).json({ error: "Failed to load reports" });
  }
}

// ─── GET /api/reports/:id ─────────────────────────────────────────────
async function getReportById(req, res) {
  try {
    const doc = await db.collection("reports").doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: "Report not found" });

    const report = docToObj(doc);
    if (!canAccessMachine(req.user, report.machineId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (report.machineId) {
      const mDoc = await db.collection("machines").doc(report.machineId).get();
      report.machine = mDoc.exists ? { id: mDoc.id, name: mDoc.data().name } : null;
    }
    const todoSnap = await db.collection("todos").where("reportId", "==", report.id).limit(1).get();
    report.todoItem = todoSnap.empty ? null : docToObj(todoSnap.docs[0]);

    return res.json(report);
  } catch (error) {
    console.error("[reports.getReportById]", error);
    return res.status(500).json({ error: "Failed to load report" });
  }
}

// ─── POST /api/reports ────────────────────────────────────────────────
async function createReport(req, res) {
  try {
    const { machineId, category, message, reporterName, reporterMobile, name, mobileNumber } = req.body;

    const finalName = (reporterName ?? name ?? "").trim();
    const finalMobile = (reporterMobile ?? mobileNumber ?? "").trim();
    const finalMessage = (message ?? "").trim();
    const digitCount = (finalMobile.match(/\d/g) || []).length;

    if (!machineId || !category || !finalMessage || !finalName || !finalMobile) {
      return res.status(400).json({ error: "machineId, category, message, reporterName, and reporterMobile are required" });
    }
    if (digitCount < 10) {
      return res.status(400).json({ error: "reporterMobile must be a valid mobile number" });
    }
    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: `category must be one of: ${VALID_CATEGORIES.join(", ")}` });
    }
    if (!canAccessMachine(req.user, machineId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const mDoc = await db.collection("machines").doc(machineId).get();
    if (!mDoc.exists) return res.status(404).json({ error: "Machine not found" });

    const ts = now();
    const docRef = await db.collection("reports").add({
      machineId,
      category,
      message: finalMessage,
      reporterName: finalName,
      reporterMobile: finalMobile,
      status: "open",
      timestamp: ts,
      createdAt: ts,
    });

    const report = docToObj(await docRef.get());
    report.machine = { id: mDoc.id, name: mDoc.data().name };
    return res.status(201).json(report);
  } catch (error) {
    console.error("[reports.createReport]", error);
    return res.status(500).json({ error: "Failed to submit report" });
  }
}

// ─── PATCH /api/reports/:id/status ───────────────────────────────────
async function updateReportStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ["open", "resolved"];
    if (!status || !allowed.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${allowed.join(", ")}` });
    }

    const doc = await db.collection("reports").doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: "Report not found" });

    const report = docToObj(doc);
    if (!canAccessMachine(req.user, report.machineId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    await db.collection("reports").doc(id).update({ status, updatedAt: now() });
    return res.json(docToObj(await db.collection("reports").doc(id).get()));
  } catch (error) {
    console.error("[reports.updateReportStatus]", error);
    return res.status(500).json({ error: "Failed to update report status" });
  }
}

module.exports = { getReports, getReportById, createReport, updateReportStatus };
