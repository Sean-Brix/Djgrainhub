const { prisma } = require("../lib/prisma");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dj-grain-hub-secret";
const TOKEN_EXPIRY = process.env.JWT_EXPIRY || "8h";

// ─── POST /api/auth/login ─────────────────────────────────────────────
// Validates credentials, returns signed JWT + user object.
async function login(req, res) {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  const user = await prisma.user.findUnique({ where: { username } });

  if (!user || user.status === "inactive") {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    {
      sub: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      accessRole: user.accessRole,
      ownedMachineId: user.ownedMachineId,
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );

  const { password: _pw, ...safeUser } = user;
  return res.json({ token, user: safeUser });
}

// ─── GET /api/auth/me ─────────────────────────────────────────────────
// Returns the authenticated user's full record (no password).
async function getMe(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.sub },
    include: { notificationPrefs: true },
  });

  if (!user) return res.status(404).json({ error: "User not found" });

  const { password: _pw, ...safeUser } = user;
  return res.json(safeUser);
}

// ─── PATCH /api/auth/me ───────────────────────────────────────────────
// Updates the current user's name (profile settings page).
async function updateMe(req, res) {
  const { name } = req.body;

  const user = await prisma.user.update({
    where: { id: req.user.sub },
    data: { name },
  });

  const { password: _pw, ...safeUser } = user;
  return res.json(safeUser);
}

// ─── PATCH /api/auth/me/password ─────────────────────────────────────
// Changes the current user's password (security settings page).
async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "currentPassword and newPassword are required" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: "New password must be at least 6 characters" });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
  const isValid = await bcrypt.compare(currentPassword, user.password);

  if (!isValid) {
    return res.status(400).json({ error: "Current password is incorrect" });
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: req.user.sub },
    data: { password: hashed },
  });

  return res.json({ message: "Password updated successfully" });
}

module.exports = { login, getMe, updateMe, changePassword };
