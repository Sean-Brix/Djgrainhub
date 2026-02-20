const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { router } = require("./routes");
const { connectMqtt } = require("./lib/mqtt");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Routes
app.use("/api", router);

// MQTT
connectMqtt();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
