const mqtt = require("mqtt");
const dotenv = require("dotenv");
const dispenseBus = require("./dispense-bus");
const messageLog = require("./message-log");

dotenv.config();

let client = null;

function connectMqtt() {
  const brokerUrl = process.env.MQTT_BROKER_URL || "mqtt://localhost:1883";

  client = mqtt.connect(brokerUrl, {
    clientId: `djgrainhub_server_${Math.random().toString(16).slice(2, 8)}`,
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    clean: true,
    reconnectPeriod: 5000,
    rejectUnauthorized: true,
  });

  client.on("connect", () => {
    console.log(`MQTT connected to ${brokerUrl}`);

    // Subscribe to both topics so the dev monitor can see all traffic
    // "dispense" — confirmation from ESP32 after a dispense attempt
    // "order"    — echoed back from broker (dev visibility into published orders)
    const topics = ["dispense", "order"];
    client.subscribe(topics, { qos: 1 }, (err) => {
      if (err) console.error("MQTT subscribe error:", err.message);
      else console.log("MQTT subscribed:", topics.join(", "));
    });

    client.on("message", (topic, rawMessage) => {
      const raw = rawMessage.toString();

      // Log every message for the dev monitor
      let parsed;
      try { parsed = JSON.parse(raw); } catch { parsed = raw; }
      messageLog.push(topic, parsed);

      // Handle dispense confirmations — signal waiting HTTP handlers
      if (topic === "dispense") {
        try {
          const payload = typeof parsed === "object" ? parsed : JSON.parse(raw);
          // ESP32 identifies the machine with the "id" key
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
  });

  client.on("error", (err) => {
    console.error("MQTT error:", err.code || err.message || err);
  });

  client.on("close", () => {
    console.warn("MQTT connection closed, will retry...");
  });

  client.on("disconnect", () => {
    console.warn("MQTT disconnected");
  });


  return client;
}

function getMqttClient() {
  if (!client) throw new Error("MQTT client not initialized");
  return client;
}

module.exports = { connectMqtt, getMqttClient };
