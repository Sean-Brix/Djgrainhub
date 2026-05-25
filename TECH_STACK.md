# DJ Grain Hub Tech Stack

This document summarizes the main technologies, frameworks, libraries, services, protocols, integrations, and development tools used in the DJ Grain Hub system.

## System Overview

DJ Grain Hub is a smart vending/kiosk and admin management system. It uses a React frontend, a Node.js/Express backend, database persistence, Firebase services, MQTT machine communication, and PayMongo payment processing.

| Area | Main Technologies | Purpose |
| --- | --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS | User interface for kiosk, dashboard, admin pages, reports, settings, and payment screens. |
| Backend | Node.js, Express.js | REST API for authentication, machines, products, sales, payments, reports, and notifications. |
| Database | MySQL, Prisma, Firebase Firestore | Stores users, machines, products, sales, alerts, reports, events, and app data. |
| Cloud | Firebase, Render | Hosting, serverless functions, storage, database rules, and production deployment. |
| Machine Communication | MQTT | Real-time machine status, telemetry, and dispense communication. |
| Payments | PayMongo | QR Ph payment intent creation, payment method attachment, and webhook confirmation. |

## Core Languages

| Technology | Category | Description |
| --- | --- | --- |
| TypeScript | Frontend language | Used for the React application and strongly typed UI code. |
| JavaScript | Backend and tooling language | Used in the Express server, Firebase Functions, controllers, routes, and scripts. |
| HTML | Markup | Provides the base document structure for the Vite frontend. |
| CSS | Styling | Used with Tailwind CSS and custom app styles. |
| SQL | Database query language | Used indirectly through Prisma with a MySQL database. |
| JSON | Data format | Used for API payloads, configuration files, Firebase config, and package manifests. |

## Frontend Stack

| Technology | Category | Description |
| --- | --- | --- |
| React | UI framework | Builds the main admin dashboard, kiosk screens, settings, reports, and payment pages. |
| React DOM | Rendering | Renders the React application into the browser DOM. |
| TypeScript | App language | Adds type safety for frontend components, props, and data structures. |
| Vite | Build tool | Runs the local dev server and builds the production frontend into `dist/`. |
| Tailwind CSS | Styling framework | Provides utility-first styling for layout, spacing, colors, and responsive UI. |
| Tailwind Vite Plugin | Build integration | Integrates Tailwind CSS with the Vite build process. |
| Vite PWA | PWA support | Generates service worker files and web app manifest for installable app behavior. |
| Capacitor | Native app bridge | Supports native/mobile packaging and device integrations. |
| Capacitor Push Notifications | Native notifications | Provides push notification support for mobile builds. |

## Frontend UI Libraries

| Library | Description |
| --- | --- |
| Radix UI | Accessible UI primitives for dialogs, menus, popovers, tabs, switches, sliders, tooltips, and related controls. |
| Material UI | Component and icon library used for polished interface elements. |
| Emotion | CSS-in-JS styling dependency used by Material UI. |
| Lucide React | Icon set used across buttons, navigation, cards, and status UI. |
| Motion | Animation library used for page transitions and UI motion. |
| Recharts | Charting library used for dashboard analytics and visual reports. |
| Leaflet / React Leaflet | Map rendering for location-based machine views. |
| React Google Maps API | Google Maps integration support. |
| React Hook Form | Form state management and validation support. |
| React Day Picker | Date picker UI support. |
| Sonner | Toast notification system. |
| Canvas Confetti | Celebration effect for success states. |
| clsx / tailwind-merge | Utility libraries for combining and cleaning class names. |

## Backend Stack

| Technology | Category | Description |
| --- | --- | --- |
| Node.js | Runtime | Runs the backend server and Firebase Functions code. |
| Express.js | Backend framework | Defines REST API routes, middleware, controllers, and error handling. |
| Prisma | ORM | Maps database models to JavaScript code and manages MySQL schema migrations. |
| Prisma Client | Database client | Used by the backend to query and update MySQL records. |
| JSON Web Token | Authentication | Handles bearer-token login sessions and protected API routes. |
| bcrypt / bcryptjs | Password security | Hashes and verifies user passwords. |
| CORS | API middleware | Allows frontend requests to reach the backend safely. |
| dotenv | Environment config | Loads local secrets and configuration from `.env` files. |
| Multer | File upload middleware | Handles image uploads for product assets. |
| Nodemon | Dev server tool | Restarts the backend automatically during local development. |

## Firebase Backend Stack

| Technology | Description |
| --- | --- |
| Firebase Functions | Serverless backend option for hosting the Express API as a cloud function. |
| Firebase Admin SDK | Server-side access to Firebase services such as Firestore and Storage. |
| Firebase Hosting | Hosts the production frontend build and rewrites `/api/**` requests to the Firebase API function. |
| Cloud Firestore | NoSQL database used by the Firebase Functions version of the backend. |
| Firebase Storage | Stores uploaded files and app media assets. |
| Firebase Rules | Security rules for Firestore and Storage access control. |
| Firebase Emulators | Local development and testing environment for Firebase services. |

## Database and Data Layer

| Technology | Description |
| --- | --- |
| MySQL | Primary relational database configured through Prisma in `server/prisma/schema.prisma`. |
| Prisma Schema | Defines app models such as `User`, `Machine`, `Product`, `Sale`, `SaleItem`, `Alert`, `Report`, `TodoItem`, `NotificationPreference`, and `MachineEvent`. |
| Prisma Migrations | Applies database schema changes safely during development and deployment. |
| Firestore | Firebase NoSQL database used by the Firebase Functions implementation. |
| XAMPP | Local development tool commonly used to run Apache/MySQL and manage local database testing through phpMyAdmin. |

## Cloud and Deployment Services

| Service | Description |
| --- | --- |
| Firebase Hosting | Hosts the static Vite build from `dist/`. |
| Firebase Cloud Functions | Runs the serverless Express API in the `asia-southeast1` region. |
| Firebase Firestore | Cloud database option for Firebase deployments. |
| Firebase Storage | Cloud file storage for uploaded images and assets. |
| Render | Node web service deployment target for the Express backend and frontend build. |
| GitHub | Source code hosting, version control, collaboration, and deployment workflow support. |

## Payment Integration

| Technology | Description |
| --- | --- |
| PayMongo | Payment gateway used for real payments in the kiosk. |
| Payment Intents | PayMongo flow used to create a payable transaction for a specific amount. |
| QR Ph | QR-based payment method for GCash, Maya, and other QR Ph-enabled apps. |
| Payment Methods API | Creates and attaches the QR Ph payment method to a PayMongo payment intent. |
| Webhooks | Receives PayMongo payment events and confirms or fails local sales. |
| Webhook Signature Verification | Verifies the `Paymongo-Signature` header using `PAYMONGO_WEBHOOK_SECRET`. |
| Payment Links | Supported backend endpoints for creating and checking PayMongo payment links. |

## Network Protocols and Communication

| Protocol / Pattern | Description |
| --- | --- |
| HTTP / HTTPS | Main protocol for frontend-to-backend communication and production API access. |
| REST API | Backend route style used for resources such as auth, machines, products, sales, reports, and payments. |
| JSON | Request and response payload format for API calls. |
| MQTT | Lightweight messaging protocol used for vending machine telemetry, status, and dispense-related communication. |
| Webhooks | Server-to-server callbacks from PayMongo to the backend payment endpoint. |
| CORS | Browser security mechanism configured so the frontend can call the backend API. |
| JWT Bearer Auth | Authentication protocol where requests include a bearer token in the `Authorization` header. |

## Developer Tools

| Tool | Description |
| --- | --- |
| VS Code | Main code editor for frontend, backend, environment files, and project configuration. |
| Postman | API testing tool used to test backend routes, authentication, payment endpoints, and webhook behavior. |
| Firebase CLI | Command-line tool for Firebase deploys, emulators, logs, hosting, and functions management. |
| XAMPP | Local server/database environment used for MySQL development and testing. |
| GitHub | Repository hosting and code version control platform. |
| Git | Version control system used for tracking source code changes. |
| npm | Package manager and script runner for frontend, backend, and Firebase Functions dependencies. |
| Prisma CLI | Database migration, generation, and studio tooling. |
| ESLint | Code linting tool used by Firebase Functions before deployment. |
| Firebase Emulator Suite | Local simulation of Firebase services for development and testing. |

## Build and Runtime Scripts

| Script / Command | Description |
| --- | --- |
| `npm run dev` | Starts the Vite frontend development server. |
| `npm run build` | Builds the production frontend into `dist/`. |
| `npm run start` | Starts the Node/Express backend from the root project. |
| `npm run serve` | Builds the frontend and starts the backend server. |
| `npm --prefix server run dev` | Starts the backend with Nodemon during development. |
| `npm --prefix server run prisma:migrate` | Runs Prisma migrations in development. |
| `npm --prefix server run prisma:studio` | Opens Prisma Studio for database inspection. |
| `npm --prefix functions run lint` | Runs ESLint for Firebase Functions. |
| `npm --prefix functions run deploy` | Deploys Firebase Functions. |

## Environment Variables

These are the main environment variables used by the backend. Secret values should stay in `.env` files or deployment dashboards and should not be committed publicly.

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | MySQL connection string used by Prisma. |
| `JWT_SECRET` | Secret key for signing and verifying JWT auth tokens. |
| `JWT_EXPIRY` | Token expiration setting. |
| `FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket name. |
| `MQTT_BROKER_URL` | MQTT broker URL for machine communication. |
| `MQTT_USERNAME` | MQTT broker username. |
| `MQTT_PASSWORD` | MQTT broker password. |
| `PAYMONGO_SECRET_KEY` | PayMongo private API key for backend payment requests. |
| `PAYMONGO_PUBLIC_KEY` | PayMongo public API key. |
| `PAYMONGO_WEBHOOK_SECRET` | PayMongo webhook signing secret for verifying incoming events. |
| `PAYMONGO_WEBHOOK_URL` | Public webhook endpoint registered in PayMongo. |
| `FRONTEND_URL` | Frontend URL used for redirects and app links. |
| `PORT` | Backend server port. |

## High-Level Architecture

```text
User / Kiosk
  -> React + Vite frontend
  -> Express REST API
  -> MySQL via Prisma or Firebase Firestore
  -> PayMongo for QR Ph payments
  -> PayMongo webhook back to /api/payment/webhook
  -> MQTT broker for machine communication
  -> Firebase / Render for cloud deployment
```

