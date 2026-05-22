const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "dj-grain-hub-secret";

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header" });
  }

  const token = header.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Token is invalid or expired" });
  }
}

function requireSuperAdmin(req, res, next) {
  if (req.user?.accessRole !== "super_admin") {
    return res.status(403).json({ error: "Forbidden: super_admin only" });
  }
  next();
}

module.exports = { authenticate, requireSuperAdmin };
