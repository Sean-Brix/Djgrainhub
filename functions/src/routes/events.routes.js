const { Router } = require("express");
const { getEventsByMachine, createEvent } = require("../controllers/events.controller");
const { authenticate } = require("../middleware/auth.middleware");

const router = Router({ mergeParams: true });
router.use(authenticate);

router.get("/", getEventsByMachine);
router.post("/", createEvent);

module.exports = { eventsRouter: router };
