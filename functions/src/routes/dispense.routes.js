const { Router } = require("express");
const { sendOrder, getLatestDispense } = require("../controllers/dispense.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = Router({ mergeParams: true });
router.use(authenticate);

router.post("/order", sendOrder);
router.get("/dispense/latest", getLatestDispense);

module.exports = { dispenseRouter: router };
