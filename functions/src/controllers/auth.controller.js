const { db, docToObj, now } = require("../lib/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dj-grain-hub-secret";
const TOKEN_EXPIRY = process.env.JWT_EXPIRY || "8h";

// ─── POST /api/auth/login ─────────────────────────────────────────────
async function login(req, res) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const snap = await db.collection("users").where("username", "==", username).limit(1).get();
    if (snap.empty) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = docToObj(snap.docs[0]);
    if (user.status === "inactive") {
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
    console.error("[auth.login]", error);
    return res.status(500).json({ error: "Failed to login" });
  }
}

// ─── GET /api/auth/me ─────────────────────────────────────────────────
async function getMe(req, res) {
  try {
    const doc = await db.collection("users").doc(req.user.sub).get();
    if (!doc.exists) return res.status(404).json({ error: "User not found" });

    const user = docToObj(doc);

    // Fetch notification prefs (stored in separate collection keyed by userId)
    const prefsDoc = await db.collection("notificationPrefs").doc(req.user.sub).get();
    user.notificationPrefs = prefsDoc.exists ? docToObj(prefsDoc) : null;

    const { password: _pw, ...safeUser } = user;
    return res.json(safeUser);
  } catch (error) {
    console.error("[auth.getMe]", error);
    return res.status(500).json({ error: "Failed to load user profile" });
  }
}

// ─── PATCH /api/auth/me ───────────────────────────────────────────────
async function updateMe(req, res) {
  try {
    const { name, email, username, role } = req.body;
    if (!name || !email || !username || !role) {
      return res.status(400).json({ error: "name, email, username, and role are required" });
    }

    // Conflict check — email or username taken by another user
    const [emailSnap, usernameSnap] = await Promise.all([
      db.collection("users").where("email", "==", email).limit(1).get(),
      db.collection("users").where("username", "==", username).limit(1).get(),
    ]);

    const emailConflict = !emailSnap.empty && emailSnap.docs[0].id !== req.user.sub;
    const usernameConflict = !usernameSnap.empty && usernameSnap.docs[0].id !== req.user.sub;
    if (emailConflict || usernameConflict) {
      return res.status(409).json({ error: "Email or username already in use" });
    }

    await db.collection("users").doc(req.user.sub).update({ name, email, username, role, updatedAt: now() });

    const updated = docToObj(await db.collection("users").doc(req.user.sub).get());
    const { password: _pw, ...safeUser } = updated;
    return res.json(safeUser);
  } catch (error) {
    console.error("[auth.updateMe]", error);
    return res.status(500).json({ error: "Failed to update profile" });
  }
}

// ─── PATCH /api/auth/me/password ─────────────────────────────────────
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "currentPassword and newPassword are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters" });
    }

    const doc = await db.collection("users").doc(req.user.sub).get();
    if (!doc.exists) return res.status(404).json({ error: "User not found" });

    const user = docToObj(doc);
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.collection("users").doc(req.user.sub).update({ password: hashed, updatedAt: now() });

    return res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("[auth.changePassword]", error);
    return res.status(500).json({ error: "Failed to update password" });
  }
}

module.exports = { login, getMe, updateMe, changePassword };
