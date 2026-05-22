const mqtt = require("mqtt");
const dispenseBus = require("./dispense-bus");
const messageLog = require("./message-log");

// Lazy singleton — persists across warm function invocations on the same container.
let client = null;
let connecting = false;

function connectMqtt() {
  if (client && client.connected) return client;
  if (connecting) return null;

  connecting = true;
  const brokerUrl = process.env.MQTT_BROKER_URL || "mqtt://localhost:1883";

  client = mqtt.connect(brokerUrl, {
    clientId: `djgrainhub_fn_${Math.random().toString(16).slice(2, 8)}`,
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    clean: true,
    reconnectPeriod: 5000,
    rejectUnauthorized: true,
  });

  client.on("connect", () => {
    connecting = false;
    console.log(`MQTT connected to ${brokerUrl}`);

    const topics = ["dispense", "order"];
    client.subscribe(topics, { qos: 1 }, (err) => {
      if (err) console.error("MQTT subscribe error:", err.message);
      else console.log("MQTT subscribed:", topics.join(", "));
    });
  });

  client.on("message", (topic, rawMessage) => {
    const raw = rawMessage.toString();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = raw;
    }

    messageLog.push(topic, parsed);

    if (topic === "dispense") {
      try {
        const payload = typeof parsed === "object" ? parsed : JSON.parse(raw);
        const machineId = payload.id;

        if (!machineId) {
          console.warn("MQTT dispense message missing id — ignoring");
          return;
        }

        console.log(`MQTT dispense received for machine ${machineId}:`, payload);
        dispenseBus.emit(`dispense:${machineId}`, payload);
      } catch (e) {
        console.error("MQTT dispense — failed to parse payload:", e.message);
      }
    }
  });

  client.on("error", (err) => {
    connecting = false;
    console.error("MQTT error:", err.code || err.message || err);
  });

  client.on("close", () => {
    connecting = false;
    console.warn("MQTT connection closed, will retry...");
  });

  client.on("disconnect", () => {
    console.warn("MQTT disconnected");
  });

  return client;
}

function getMqttClient() {
  if (client && client.connected) return client;
  // Attempt reconnect for callers that need an immediate client
  const c = connectMqtt();
  if (!c || !c.connected) {
    throw new Error("MQTT broker not connected. Try again shortly.");
  }
  return c;
}

module.exports = { connectMqtt, getMqttClient };
