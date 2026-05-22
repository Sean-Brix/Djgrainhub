const { Router } = require("express");
const { getUsers, getUserById, createUser, updateUser, deleteUser } = require("../controllers/users.controller");
const { authenticate, requireSuperAdmin } = require("../middleware/auth.middleware");

const router = Router();
router.use(authenticate, requireSuperAdmin);

router.get("/", getUsers);
router.post("/", createUser);
router.get("/:id", getUserById);
router.patch("/:id", updateUser);
router.delete("/:id", deleteUser);

module.exports = { usersRouter: router };
