const mqtt = require("mqtt");
const dotenv = require("dotenv");

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

    client.publish("djgrainhub/test", "Testing", { qos: 1 }, (err) => {
      if (err) console.error("MQTT publish error:", err.message);
      else console.log("MQTT published: Testing → djgrainhub/test");
    });

    client.subscribe("Testing", { qos:2 }, ()=>{
        console.log("Testing Subscribed");
    })

    client.on("message", (topic, message)=>{
        switch(topic){
            case "Testing":
                console.log("The message is: " + message);
            default:
                return;
        }
    })

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
