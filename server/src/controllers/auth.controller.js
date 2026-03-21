const { prisma } = require("../lib/prisma");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dj-grain-hub-secret";
const TOKEN_EXPIRY = process.env.JWT_EXPIRY || "8h";

function isDatabaseUnavailable(error) {
  if (!error) return false;
  if (error.code === "P2024") return true;
  if (error.name === "PrismaClientInitializationError") return true;
  const msg = String(error.message || "");
  return (
    msg.includes("Can't reach database server") ||
    msg.includes("PrismaClientInitializationError") ||
    msg.includes("Error opening a TLS connection") ||
    msg.includes("root certificate which is not trusted")
  );
}

// ─── POST /api/auth/login ─────────────────────────────────────────────
// Validates credentials, returns signed JWT + user object.
async function login(req, res) {
  try {
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
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return res.status(503).json({ error: "Database is temporarily unavailable. Please try again." });
    }
    console.error("[auth.login]", error);
    return res.status(500).json({ error: "Failed to login" });
  }
}

// ─── GET /api/auth/me ─────────────────────────────────────────────────
// Returns the authenticated user's full record (no password).
async function getMe(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.sub },
      include: { notificationPrefs: true },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    const { password: _pw, ...safeUser } = user;
    return res.json(safeUser);
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return res.status(503).json({ error: "Database is temporarily unavailable. Please try again." });
    }
    console.error("[auth.getMe]", error);
    return res.status(500).json({ error: "Failed to load user profile" });
  }
}

// ─── PATCH /api/auth/me ───────────────────────────────────────────────
// Updates current user's profile fields (name/email/username/role).
async function updateMe(req, res) {
  try {
    const { name, email, username, role } = req.body;

    if (!name || !email || !username || !role) {
      return res.status(400).json({ error: "name, email, username, and role are required" });
    }

    const conflict = await prisma.user.findFirst({
      where: {
        id: { not: req.user.sub },
        OR: [{ email }, { username }],
      },
      select: { id: true },
    });

    if (conflict) {
      return res.status(409).json({ error: "Email or username already in use" });
    }

    const user = await prisma.user.update({
      where: { id: req.user.sub },
      data: {
        name,
        email,
        username,
        role,
      },
    });

    const { password: _pw, ...safeUser } = user;
    return res.json(safeUser);
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return res.status(503).json({ error: "Database is temporarily unavailable. Please try again." });
    }
    console.error("[auth.updateMe]", error);
    return res.status(500).json({ error: "Failed to update profile" });
  }
}

// ─── PATCH /api/auth/me/password ─────────────────────────────────────
// Changes the current user's password (security settings page).
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "currentPassword and newPassword are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

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
  } catch (error) {
    if (isDatabaseUnavailable(error)) {
      return res.status(503).json({ error: "Database is temporarily unavailable. Please try again." });
    }
    console.error("[auth.changePassword]", error);
    return res.status(500).json({ error: "Failed to update password" });
  }
}

module.exports = { login, getMe, updateMe, changePassword };
