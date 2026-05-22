const { Router } = require("express");
const { getMachines, getMachineById, createMachine, updateMachine, deleteMachine } = require("../controllers/machines.controller");
const { authenticate, requireSuperAdmin } = require("../middleware/auth.middleware");

const router = Router();
router.use(authenticate);

router.get("/", getMachines);
router.post("/", requireSuperAdmin, createMachine);
router.get("/:id", getMachineById);
router.patch("/:id", updateMachine);
router.delete("/:id", requireSuperAdmin, deleteMachine);

module.exports = { machinesRouter: router };
