const { prisma } = require("../lib/prisma");

function machineFilter(user) {
  if (user.accessRole === "super_admin") return {};
  return user.ownedMachineId ? { machineId: user.ownedMachineId } : { machineId: "NONE" };
}

function canAccessMachine(user, machineId) {
  return user.accessRole === "super_admin" || user.ownedMachineId === machineId;
}

// ─── GET /api/todos ───────────────────────────────────────────────────
// Returns all to-do items derived from reports.
// Supports ?completed=true|false, ?machineId=
async function getTodos(req, res) {
  const { completed, machineId } = req.query;

  const where = {
    ...machineFilter(req.user),
    ...(machineId && { machineId }),
    ...(completed !== undefined && { completed: completed === "true" }),
  };

  const todos = await prisma.todoItem.findMany({
    where,
    include: {
      report: {
        select: {
          id: true,
          category: true,
          status: true,
          machine: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return res.json(todos);
}

// ─── POST /api/todos ──────────────────────────────────────────────────
// Creates a to-do item from an existing Report.
// One report can only have one todo (enforced by @unique on reportId).
async function createTodo(req, res) {
  const { reportId } = req.body;

  if (!reportId) {
    return res.status(400).json({ error: "reportId is required" });
  }

  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: { machine: { select: { id: true, name: true } } },
  });

  if (!report) return res.status(404).json({ error: "Report not found" });
  if (!canAccessMachine(req.user, report.machineId)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const existing = await prisma.todoItem.findUnique({ where: { reportId } });
  if (existing) {
    return res.status(409).json({ error: "A to-do already exists for this report" });
  }

  const contactStr = [report.reporterName, report.reporterMobile]
    .filter(Boolean)
    .join(" | ");
  const description = contactStr
    ? `Contact: ${contactStr}\n\n${report.message}`
    : report.message;

  const todo = await prisma.todoItem.create({
    data: {
      reportId,
      machineId: report.machineId,
      title: `Fix ${report.category} at ${report.machine?.name || report.machineId}`,
      description,
      category: report.category,
      completed: false,
    },
    include: { report: true },
  });

  return res.status(201).json(todo);
}

// ─── PATCH /api/todos/:id ─────────────────────────────────────────────
// Toggles completed status or updates title/description.
async function updateTodo(req, res) {
  const { id } = req.params;
  const { completed, title, description } = req.body;

  const existing = await prisma.todoItem.findUnique({ where: { id } });
  if (!existing) return res.status(404).json({ error: "To-do item not found" });
  if (!canAccessMachine(req.user, existing.machineId)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const todo = await prisma.todoItem.update({
    where: { id },
    data: {
      ...(completed !== undefined && { completed: Boolean(completed) }),
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
    },
  });

  return res.json(todo);
}

// ─── DELETE /api/todos/:id ────────────────────────────────────────────
// Permanently removes a to-do item.
async function deleteTodo(req, res) {
  const existing = await prisma.todoItem.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: "To-do item not found" });
  if (!canAccessMachine(req.user, existing.machineId)) {
    return res.status(403).json({ error: "Forbidden" });
  }

  await prisma.todoItem.delete({ where: { id: req.params.id } });
  return res.json({ message: "To-do item deleted" });
}

module.exports = { getTodos, createTodo, updateTodo, deleteTodo };
