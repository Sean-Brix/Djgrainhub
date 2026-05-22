const { db, docToObj, now } = require("../lib/db");

function canAccessMachine(user, machineId) {
  return user.accessRole === "super_admin" || user.ownedMachineId === machineId;
}

function byCreatedAtDesc(a, b) {
  return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
}

// ─── GET /api/todos ───────────────────────────────────────────────────
async function getTodos(req, res) {
  const { completed, machineId } = req.query;

  let q = db.collection("todos");

  if (req.user.accessRole !== "super_admin" && req.user.ownedMachineId) {
    q = db.collection("todos").where("machineId", "==", req.user.ownedMachineId);
  } else if (req.user.accessRole !== "super_admin") {
    return res.json([]);
  }

  if (machineId) q = q.where("machineId", "==", machineId);
  if (completed !== undefined) q = q.where("completed", "==", completed === "true");

  const snap = await q.get();

  const todos = await Promise.all(
    snap.docs.map(async (doc) => {
      const todo = docToObj(doc);
      if (todo.reportId) {
        const rDoc = await db.collection("reports").doc(todo.reportId).get();
        if (rDoc.exists) {
          const report = docToObj(rDoc);
          let machineName = report.machineId;
          if (report.machineId) {
            const mDoc = await db.collection("machines").doc(report.machineId).get();
            if (mDoc.exists) machineName = mDoc.data().name;
          }
          todo.report = {
            id: rDoc.id,
            category: report.category,
            status: report.status,
            machine: { id: report.machineId, name: machineName },
          };
        }
      }
      return todo;
    })
  );

  return res.json(todos.sort(byCreatedAtDesc));
}

// ─── POST /api/todos ──────────────────────────────────────────────────
async function createTodo(req, res) {
  const { reportId } = req.body;
  if (!reportId) return res.status(400).json({ error: "reportId is required" });

  const rDoc = await db.collection("reports").doc(reportId).get();
  if (!rDoc.exists) return res.status(404).json({ error: "Report not found" });

  const report = docToObj(rDoc);
  if (!canAccessMachine(req.user, report.machineId)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  // One todo per report
  const existingSnap = await db.collection("todos").where("reportId", "==", reportId).limit(1).get();
  if (!existingSnap.empty) {
    return res.status(409).json({ error: "A to-do already exists for this report" });
  }

  let machineName = report.machineId;
  if (report.machineId) {
    const mDoc = await db.collection("machines").doc(report.machineId).get();
    if (mDoc.exists) machineName = mDoc.data().name;
  }

  const contactStr = [report.reporterName, report.reporterMobile].filter(Boolean).join(" | ");
  const description = contactStr ? `Contact: ${contactStr}\n\n${report.message}` : report.message;

  const ts = now();
  const docRef = await db.collection("todos").add({
    reportId,
    machineId: report.machineId,
    title: `Fix ${report.category} at ${machineName}`,
    description,
    category: report.category,
    completed: false,
    createdAt: ts,
    updatedAt: ts,
  });

  const todo = docToObj(await docRef.get());
  todo.report = docToObj(rDoc);
  return res.status(201).json(todo);
}

// ─── PATCH /api/todos/:id ─────────────────────────────────────────────
async function updateTodo(req, res) {
  const { id } = req.params;
  const { completed, title, description } = req.body;

  const doc = await db.collection("todos").doc(id).get();
  if (!doc.exists) return res.status(404).json({ error: "To-do item not found" });

  const todo = docToObj(doc);
  if (!canAccessMachine(req.user, todo.machineId)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const data = { updatedAt: now() };
  if (completed !== undefined) data.completed = Boolean(completed);
  if (title !== undefined) data.title = title;
  if (description !== undefined) data.description = description;

  await db.collection("todos").doc(id).update(data);
  return res.json(docToObj(await db.collection("todos").doc(id).get()));
}

// ─── DELETE /api/todos/:id ────────────────────────────────────────────
async function deleteTodo(req, res) {
  const doc = await db.collection("todos").doc(req.params.id).get();
  if (!doc.exists) return res.status(404).json({ error: "To-do item not found" });

  const todo = docToObj(doc);
  if (!canAccessMachine(req.user, todo.machineId)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  await db.collection("todos").doc(req.params.id).delete();
  return res.json({ message: "To-do item deleted" });
}

module.exports = { getTodos, createTodo, updateTodo, deleteTodo };
