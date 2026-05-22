const { EventEmitter } = require("events");

// Bridges MQTT "dispense" messages to waiting HTTP handlers within the same
// function container instance.
const dispenseBus = new EventEmitter();
dispenseBus.setMaxListeners(50);

module.exports = dispenseBus;
