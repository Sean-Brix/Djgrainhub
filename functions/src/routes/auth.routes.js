const { Router } = require("express");
const { login, getMe, updateMe, changePassword } = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth.middleware");

const authRouter = Router();

authRouter.post("/login", login);
authRouter.get("/me", authenticate, getMe);
authRouter.patch("/me", authenticate, updateMe);
authRouter.patch("/me/password", authenticate, changePassword);

module.exports = { authRouter };
