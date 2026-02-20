const { Router } = require("express");
const { getEventsByMachine, createEvent } = require("../controllers/events.controller");
const { authenticate } = require("../middleware/auth.middleware");

// These are mounted as nested routes under /api/machines/:machineId/events
// via the main router in index.js

const router = Router({ mergeParams: true });
router.use(authenticate);

// GET    /api/machines/:machineId/events    — paginated MQTT event log (?type, ?limit, ?page)
// POST   /api/machines/:machineId/events    — log an event (internal or manual)

router.get("/", getEventsByMachine);
router.post("/", createEvent);

module.exports = { eventsRouter: router };
