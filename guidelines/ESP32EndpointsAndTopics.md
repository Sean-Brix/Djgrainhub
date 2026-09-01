# ESP32 Connection: HTTP Endpoints

## Order Dispatch
- Server sends a GET request to `DEVICE_ORDER_URL`.
- Default URL: `https://ardevcore.site/iotsystem/update.php`
- Query parameter: `value=slot1,slot2,slot3,slot4,slot5,slot6`
- Example: `https://ardevcore.site/iotsystem/update.php?value=0,0,1,0,0,0`

The value list is ordered by slot number and contains the quantity to dispense per slot.

## Dispense Status Polling
- Server polls `DEVICE_STATUS_URL`.
- Default URL: `https://ardevcore.site/iotsystem/vendo.php`
- Expected response format: `false,false,false,false,false,false`

Each comma-separated boolean maps to slots 1 through 6. Only ordered slots need to become `true`.

Example:
- Order: `slot3 = 1`
- Status response: `false,false,true,false,false,false`
- Result: completed, because the ordered slot became `true`.

## App Endpoints Involved In Dispensing
- `POST /api/machines/:machineId/order` - sends the HTTP order and polls status for up to about 90s.
- `GET /api/machines/:machineId/dispense/latest` - returns the last stored dispense confirmation.
