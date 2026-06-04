const { Router } = require("express");
const {
  sendOrder,
  receiveDispenseConfirmation,
  getLatestDispense,
} = require("../controllers/dispense.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = Router({ mergeParams: true });

router.post("/dispense", receiveDispenseConfirmation);

router.use(authenticate);
router.post("/order", sendOrder);
router.get("/dispense/latest", getLatestDispense);

module.exports = { dispenseRouter: router };
