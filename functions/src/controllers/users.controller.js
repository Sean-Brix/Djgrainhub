const { db, docToObj, now } = require("../lib/db");
const bcrypt = require("bcryptjs");

// ─── GET /api/users ───────────────────────────────────────────────────
async function getUsers(req, res) {
  const snap = await db.collection("users").orderBy("createdAt", "asc").get();
  const users = snap.docs.map((doc) => {
    const u = docToObj(doc);
    const { password: _pw, ...safe } = u;
    return safe;
  });
  return res.json(users);
}

// ─── GET /api/users/:id ───────────────────────────────────────────────
async function getUserById(req, res) {
  const doc = await db.collection("users").doc(req.params.id).get();
  if (!doc.exists) return res.status(404).json({ error: "User not found" });

  const u = docToObj(doc);
  const { password: _pw, ...safe } = u;
  return res.json(safe);
}

// ─── POST /api/users ──────────────────────────────────────────────────
async function createUser(req, res) {
  const { name, email, username, password, role, accessRole, status, ownedMachineId } = req.body;

  if (!name || !email || !username || !password || !accessRole) {
    return res.status(400).json({ error: "name, email, username, password, and accessRole are required" });
  }

  const [emailSnap, usernameSnap] = await Promise.all([
    db.collection("users").where("email", "==", email).limit(1).get(),
    db.collection("users").where("username", "==", username).limit(1).get(),
  ]);
  if (!emailSnap.empty || !usernameSnap.empty) {
    return res.status(409).json({ error: "Email or username already in use" });
  }

  const hashed = await bcrypt.hash(password, 10);
  const ts = now();

  const docRef = await db.collection("users").add({
    name,
    email,
    username,
    password: hashed,
    role: role || "Retail Operator",
    accessRole,
    status: status || "active",
    ownedMachineId: ownedMachineId || null,
    createdAt: ts,
    updatedAt: ts,
  });

  const u = docToObj(await docRef.get());
  const { password: _pw, ...safe } = u;
  return res.status(201).json(safe);
}

// ─── PATCH /api/users/:id ─────────────────────────────────────────────
async function updateUser(req, res) {
  const { id } = req.params;
  const { name, role, accessRole, status, ownedMachineId } = req.body;

  const data = { updatedAt: now() };
  if (name !== undefined) data.name = name;
  if (role !== undefined) data.role = role;
  if (accessRole !== undefined) data.accessRole = accessRole;
  if (status !== undefined) data.status = status;
  if (ownedMachineId !== undefined) data.ownedMachineId = ownedMachineId;

  await db.collection("users").doc(id).update(data);

  const u = docToObj(await db.collection("users").doc(id).get());
  const { password: _pw, ...safe } = u;
  return res.json(safe);
}

// ─── DELETE /api/users/:id ────────────────────────────────────────────
async function deleteUser(req, res) {
  if (req.params.id === req.user.sub) {
    return res.status(400).json({ error: "Cannot delete your own account" });
  }
  await db.collection("users").doc(req.params.id).delete();
  return res.json({ message: "User deleted" });
}

module.exports = { getUsers, getUserById, createUser, updateUser, deleteUser };
