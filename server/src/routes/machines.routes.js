const { Router } = require("express");
const {
  getMachines,
  getMachineById,
  createMachine,
  updateMachine,
  deleteMachine,
} = require("../controllers/machines.controller");
const { authenticate, requireSuperAdmin } = require("../middleware/auth.middleware");

const router = Router();

// All machine routes require authentication
router.use(authenticate);

// GET    /api/machines             — list visible machines (with products)
// POST   /api/machines             — register new machine (super_admin)
// GET    /api/machines/:id         — machine detail with sales + alerts
// PATCH  /api/machines/:id         — update machine fields
// DELETE /api/machines/:id         — delete machine + cascade products (super_admin)

router.get("/", getMachines);
router.post("/", requireSuperAdmin, createMachine);
router.get("/:id", getMachineById);
router.patch("/:id", updateMachine);
router.delete("/:id", requireSuperAdmin, deleteMachine);

module.exports = { machinesRouter: router };
