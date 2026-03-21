const { Router } = require("express");
const { login, getMe, updateMe, changePassword } = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = Router();

const asyncRoute = (handler) => (req, res, next) => {
	Promise.resolve(handler(req, res, next)).catch(next);
};

// POST   /api/auth/login           — get JWT token
// GET    /api/auth/me              — current user info
// PATCH  /api/auth/me              — update profile (name)
// PATCH  /api/auth/me/password     — change password

router.post("/login", asyncRoute(login));
router.get("/me", authenticate, asyncRoute(getMe));
router.patch("/me", authenticate, asyncRoute(updateMe));
router.patch("/me/password", authenticate, asyncRoute(changePassword));

module.exports = { authRouter: router };
