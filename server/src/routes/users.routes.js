const { Router } = require("express");
const {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} = require("../controllers/users.controller");
const { authenticate, requireSuperAdmin } = require("../middleware/auth.middleware");

const router = Router();

// All user management is super_admin only
router.use(authenticate, requireSuperAdmin);

// GET    /api/users                — list all users
// POST   /api/users                — create user
// GET    /api/users/:id            — user detail
// PATCH  /api/users/:id            — update user
// DELETE /api/users/:id            — delete user

router.get("/", getUsers);
router.post("/", createUser);
router.get("/:id", getUserById);
router.patch("/:id", updateUser);
router.delete("/:id", deleteUser);

module.exports = { usersRouter: router };
