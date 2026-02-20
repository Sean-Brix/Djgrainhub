const { Router } = require("express");
const { login, getMe, updateMe, changePassword } = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = Router();

// POST   /api/auth/login           — get JWT token
// GET    /api/auth/me              — current user info
// PATCH  /api/auth/me              — update profile (name)
// PATCH  /api/auth/me/password     — change password

router.post("/login", login);
router.get("/me", authenticate, getMe);
router.patch("/me", authenticate, updateMe);
router.patch("/me/password", authenticate, changePassword);

module.exports = { authRouter: router };
