/**
 * dispense-bus.js
 *
 * A tiny EventEmitter singleton that bridges the MQTT "dispense" subscriber
 * message to whatever HTTP handler is currently waiting for it.
 *
 * Usage:
 *   dispenseBus.once(`dispense:${machineId}`, (payload) => { ... });
 *   dispenseBus.emit(`dispense:${machineId}`, parsedPayload);
 */

const { EventEmitter } = require("events");

const dispenseBus = new EventEmitter();
dispenseBus.setMaxListeners(50); // support many concurrent kiosk sessions

module.exports = dispenseBus;
