const { prisma } = require("../lib/prisma");
const bcrypt = require("bcrypt");

// All user management endpoints are super_admin only
// (enforced in the route middleware, double-checked here)

// ─── GET /api/users ───────────────────────────────────────────────────
// Lists all users. super_admin only.
async function getUsers(req, res) {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      role: true,
      accessRole: true,
      status: true,
      ownedMachineId: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return res.json(users);
}

// ─── GET /api/users/:id ───────────────────────────────────────────────
async function getUserById(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      role: true,
      accessRole: true,
      status: true,
      ownedMachineId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json(user);
}

// ─── POST /api/users ──────────────────────────────────────────────────
// Creates a new user account. super_admin only.
async function createUser(req, res) {
  const { name, email, username, password, role, accessRole, status, ownedMachineId } = req.body;

  if (!name || !email || !username || !password || !accessRole) {
    return res.status(400).json({
      error: "name, email, username, password, and accessRole are required",
    });
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { username }] },
  });
  if (existing) {
    return res.status(409).json({ error: "Email or username already in use" });
  }

  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      username,
      password: hashed,
      role: role || "Retail Operator",
      accessRole,
      status: status || "active",
      ownedMachineId: ownedMachineId || null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      role: true,
      accessRole: true,
      status: true,
      ownedMachineId: true,
      createdAt: true,
    },
  });

  return res.status(201).json(user);
}

// ─── PATCH /api/users/:id ─────────────────────────────────────────────
// Updates user details. super_admin only.
async function updateUser(req, res) {
  const { id } = req.params;
  const { name, role, accessRole, status, ownedMachineId } = req.body;

  const user = await prisma.user.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(role !== undefined && { role }),
      ...(accessRole !== undefined && { accessRole }),
      ...(status !== undefined && { status }),
      ...(ownedMachineId !== undefined && { ownedMachineId }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      username: true,
      role: true,
      accessRole: true,
      status: true,
      ownedMachineId: true,
      updatedAt: true,
    },
  });

  return res.json(user);
}

// ─── DELETE /api/users/:id ────────────────────────────────────────────
// Deletes a user. super_admin only. Cannot delete yourself.
async function deleteUser(req, res) {
  if (req.params.id === req.user.sub) {
    return res.status(400).json({ error: "Cannot delete your own account" });
  }

  await prisma.user.delete({ where: { id: req.params.id } });
  return res.json({ message: "User deleted" });
}

module.exports = { getUsers, getUserById, createUser, updateUser, deleteUser };
