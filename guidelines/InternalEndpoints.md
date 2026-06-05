# Internal HTTP Endpoints (System)

Base path for backend APIs: `/api`

## Health
- `GET /api/health` — health check (public)

## Auth
- `POST /api/auth/login` — login, returns JWT (public)
- `GET /api/auth/me` — current user (auth)
- `PATCH /api/auth/me` — update profile (auth)
- `PATCH /api/auth/me/password` — change password (auth)

## Machines
- `GET /api/machines` — list machines (+ products) (auth)
- `POST /api/machines` — create machine (super_admin)
- `GET /api/machines/:id` — machine detail (auth)
- `PATCH /api/machines/:id` — update machine (auth)
- `DELETE /api/machines/:id` — delete machine (super_admin)

## Machine Products (nested)
- `GET /api/machines/:machineId/products` — list products for machine (auth)
- `POST /api/machines/:machineId/products` — add product to slot (auth, supports image upload)

## Products (flat)
- `PATCH /api/products/:id` — update product (auth, supports image upload)
- `DELETE /api/products/:id` — delete product (auth)
- `PATCH /api/products/:id/stock` — decrement stock (auth)
- `POST /api/products/:id/image` — upload product image (auth, multipart field: `image`)
- `GET /api/products/:id/image` — get product image (public)

## Machine Events
- `GET /api/machines/:machineId/events` — list event log (auth)
- `POST /api/machines/:machineId/events` — create event log entry (auth)

## Dispense (ESP32 integration)
- `POST /api/machines/:machineId/order` - send HTTP dispense order (auth; polls `vendo.php` until ordered slots are true)
- `GET /api/machines/:machineId/dispense/latest` - last dispense result (auth)

## Sales
- `GET /api/sales` — list sales (auth)
- `GET /api/sales/export` — export sales CSV (auth)
- `GET /api/sales/:id` — sale detail (auth)
- `POST /api/sales` — create sale (auth)
- `PATCH /api/sales/:id/complete` — complete sale (auth)
- `PATCH /api/sales/:id/fail` — mark pending payment sale failed (auth)

## Alerts
- `GET /api/alerts` — list alerts (auth)
- `POST /api/alerts` — create alert (auth)
- `GET /api/alerts/:id` — alert detail (auth)
- `PATCH /api/alerts/:id` — update alert status (auth)

## Reports
- `GET /api/reports` — list reports (auth)
- `POST /api/reports` — create report (auth)
- `GET /api/reports/:id` — report detail (auth)
- `PATCH /api/reports/:id/status` — update report status (auth)

## Todos
- `GET /api/todos` — list todos (auth)
- `POST /api/todos` — create todo (auth)
- `PATCH /api/todos/:id` — update todo (auth)
- `DELETE /api/todos/:id` — delete todo (auth)

## Users (admin)
- `GET /api/users` — list users (super_admin)
- `POST /api/users` — create user (super_admin)
- `GET /api/users/:id` — user detail (super_admin)
- `PATCH /api/users/:id` — update user (super_admin)
- `DELETE /api/users/:id` — delete user (super_admin)

## Notifications
- `GET /api/notifications/preferences` — get notification prefs (auth)
- `PATCH /api/notifications/preferences` — update notification prefs (auth)

## Dashboard
- `GET /api/dashboard/stats` — KPI stats (auth)
- `GET /api/dashboard/revenue-chart` — revenue chart (auth)
- `GET /api/dashboard/product-mix` — product mix (auth)
- `GET /api/dashboard/recent-transactions` — recent sales (auth)
- `GET /api/dashboard/low-stock` — low stock machines (auth)

## Payments (PayMongo)
- `POST /api/payment/intent` — create payment intent (auth)
- `GET /api/payment/intent/:id` — get payment intent (auth)
- `POST /api/payment/intent/:id/confirm` — verify paid intent and complete matching sale (auth)
- `POST /api/payment/intent/:id/attach` — attach payment method (auth)
- `POST /api/payment/method` — create payment method (auth)
- `POST /api/payment/link` — create payment link (auth)
- `GET /api/payment/link/:id` — get payment link (auth)
- `POST /api/payment/webhook` — PayMongo webhook receiver (public)
- `POST /api/payments/webhook` — PayMongo webhook receiver alias (public)
- `GET /api/payment/webhook/log` — webhook log (auth)
- `DELETE /api/payment/webhook/log` — clear webhook log (auth)
- `GET /api/payment/debug/:id` — inspect a PayMongo Payment Intent, matched sale, and webhook/debug logs (auth)

## Dev (MQTT tools)
- `POST /api/dev/mqtt/publish` — publish any topic/payload (auth)
- `POST /api/dev/mqtt/simulate-dispense` — simulate dispense confirmation (auth)
- `GET /api/dev/mqtt/messages` — recent MQTT messages (auth)
- `DELETE /api/dev/mqtt/messages` — clear MQTT message log (auth)

## PWA / Static (only when `dist/` exists)
- `GET /manifest.webmanifest` — PWA manifest (public)
- `GET /sw.js` — service worker (public)
- `GET /workbox-*.js` — Workbox runtime files (public)
- `GET /assets/*` — Vite build assets (public)
- `GET /*` — SPA fallback to `index.html` (public, non-`/api`)
