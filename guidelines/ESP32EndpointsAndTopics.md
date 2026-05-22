# ESP32 Connection: Endpoints + MQTT Topics

## MQTT broker
- URL: `MQTT_BROKER_URL` (default: `mqtt://localhost:1883`)
- Port: `1883` (see `server/mosquitto.conf`)
- Auth: broker currently allows anonymous; server supports `MQTT_USERNAME` / `MQTT_PASSWORD`
- QoS: server uses `qos: 1` for subscribe/publish

## MQTT topics (ESP32 contract)
- `order` (ESP32 **subscribes**) — dispense instruction
  - payload: `{ id: "<machineId>", slot1..slot6: <int qty> }`
- `dispense` (ESP32 **publishes**) — dispense confirmation/result
  - payload: `{ id: "<machineId>", slot1..slot6: <boolean ok> }`

Notes:
- `id` is required in both directions (server uses it to match a machine).
- Slots are fixed: `slot1`…`slot6`.

## HTTP endpoints involved in ESP32 dispensing flow
(These are called by the kiosk/admin app; the server bridges them to MQTT.)
- `POST /api/machines/:machineId/order` — publishes MQTT `order` and waits up to ~90s for MQTT `dispense`
- `GET /api/machines/:machineId/dispense/latest` — returns the last stored dispense confirmation
