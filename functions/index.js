const { setGlobalOptions } = require("firebase-functions");
const { onRequest } = require("firebase-functions/v2/https");
const app = require("./src/app");

setGlobalOptions({ maxInstances: 10 });

exports.api = onRequest(
  {
    region: "asia-southeast1",
    timeoutSeconds: 120,
    memory: "512MiB",
    invoker: "public",
  },
  app
);
