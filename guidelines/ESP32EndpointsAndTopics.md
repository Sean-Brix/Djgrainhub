# ESP32 Connection: HTTP Endpoints

## Order Dispatch
- Server sends a GET request to `DEVICE_ORDER_URL`.
- Default URL: `https://phsolutions.tech/iotsystem/update.php`
- Query parameter: `value=slot1,slot2,slot3,slot4,slot5,slot6`
- Example: `https://phsolutions.tech/iotsystem/update.php?value=0,0,1,0,0,0`

The value list is ordered by slot number and contains the quantity to dispense per slot.

## Dispense Confirmation Callback
- Device calls: `POST /api/machines/:machineId/dispense`
- Auth: public device callback
- JSON payload:

```json
{
  "slot1": true,
  "slot2": true,
  "slot3": true,
  "slot4": true,
  "slot5": true,
  "slot6": true
}
```

Notes:
- Do not include `id` in the confirmation payload.
- The machine is identified by `:machineId` in the URL.
- Slots are fixed: `slot1` through `slot6`.
- Form-encoded bodies and query-string booleans are also accepted for hardware clients.

## App Endpoints Involved In Dispensing
- `POST /api/machines/:machineId/order` - sends the HTTP order and waits up to about 90s for confirmation.
- `POST /api/machines/:machineId/dispense` - receives slot boolean confirmation from the device.
- `GET /api/machines/:machineId/dispense/latest` - returns the last stored dispense confirmation.
