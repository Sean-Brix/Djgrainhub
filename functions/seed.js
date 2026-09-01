/**
 * Firestore Seed — DJ Grain Hub
 *
 * Populates Firestore with the demo dataset AND uploads every product image
 * to Firebase Storage at products/<productId>/image — the exact path that
 * GET /api/products/:id/image streams back to the app.
 *
 * Run:
 *   npm run fill          (from server/)
 *   node seed.js          (from functions/)
 *
 * Flags:
 *   --skip-images   seed Firestore only, leave Storage untouched
 *
 * Credentials — pick ONE:
 *   1. Service account key (easiest for local seeding):
 *        Firebase Console -> Project settings -> Service accounts -> Generate new private key
 *        Save the file as functions/serviceAccountKey.json (auto-detected, git-ignored),
 *        or set GOOGLE_APPLICATION_CREDENTIALS to its absolute path.
 *   2. gcloud Application Default Credentials:
 *        gcloud auth application-default login
 *        gcloud auth application-default set-quota-project dj-grain-hub
 *   3. Emulators (no credentials needed):
 *        set FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
 *        set FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199
 */

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const admin = require("firebase-admin");
const bcrypt = require("bcryptjs");
const fs = require("fs");

const SKIP_IMAGES = process.argv.includes("--skip-images");
const USING_EMULATOR = Boolean(process.env.FIRESTORE_EMULATOR_HOST);

function sanitizeBucketName(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/^['"]|['"]$/g, "");
  if (!trimmed) return null;

  // Allow either raw bucket name or gs://<bucket>
  return trimmed.replace(/^gs:\/\//, "").replace(/\/+$/, "");
}

function sanitizeProjectId(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().replace(/^['"]|['"]$/g, "");
  return trimmed ? trimmed : null;
}

function resolveProjectId() {
  const explicit =
    sanitizeProjectId(process.env.FIREBASE_PROJECT_ID) ||
    sanitizeProjectId(process.env.GOOGLE_CLOUD_PROJECT) ||
    sanitizeProjectId(process.env.GCLOUD_PROJECT);
  if (explicit) return explicit;

  // Firebase runtimes sometimes provide FIREBASE_CONFIG (JSON string or path)
  const firebaseConfig = process.env.FIREBASE_CONFIG;
  if (typeof firebaseConfig === "string" && firebaseConfig.trim()) {
    try {
      const raw = firebaseConfig.trim();
      const configJson = raw.startsWith("{")
        ? raw
        : fs.readFileSync(path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw), "utf8");
      const parsed = JSON.parse(configJson);
      const fromConfig = sanitizeProjectId(parsed.projectId || parsed.project_id);
      if (fromConfig) return fromConfig;
    } catch {
      // ignore
    }
  }

  // Local dev: read .firebaserc in repo root
  try {
    const rcPath = path.join(__dirname, "..", ".firebaserc");
    const parsed = JSON.parse(fs.readFileSync(rcPath, "utf8"));
    const fromRc = sanitizeProjectId(parsed?.projects?.default);
    if (fromRc) return fromRc;
  } catch {
    // ignore
  }

  return null;
}

// ─── Credentials ──────────────────────────────────────────────────────

const KEY_CANDIDATES = [
  process.env.GOOGLE_APPLICATION_CREDENTIALS,
  path.join(__dirname, "serviceAccountKey.json"),
  path.join(__dirname, "service-account.json"),
  path.join(__dirname, "..", "serviceAccountKey.json"),
  path.join(__dirname, "..", "service-account.json"),
];

function loadServiceAccount() {
  const inline = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (typeof inline === "string" && inline.trim().startsWith("{")) {
    try {
      return { source: "FIREBASE_SERVICE_ACCOUNT env var", json: JSON.parse(inline) };
    } catch {
      console.warn("  ⚠ FIREBASE_SERVICE_ACCOUNT is not valid JSON — ignoring it.");
    }
  }

  for (const candidate of KEY_CANDIDATES) {
    if (!candidate) continue;
    const keyPath = path.isAbsolute(candidate) ? candidate : path.join(process.cwd(), candidate);
    if (!fs.existsSync(keyPath)) continue;
    try {
      return { source: keyPath, json: JSON.parse(fs.readFileSync(keyPath, "utf8")) };
    } catch (err) {
      console.warn(`  ⚠ Could not parse service account key at ${keyPath}: ${err.message}`);
    }
  }

  return null;
}

const CREDENTIAL_HELP = [
  "",
  "🔑 No usable Google credentials were found, so nothing was written.",
  "",
  "Pick one of these, then run the seed again:",
  "",
  "  A) Service account key (recommended for local seeding)",
  "     1. Firebase Console -> Project settings -> Service accounts",
  "     2. Click \"Generate new private key\"",
  "     3. Save the downloaded file as:  functions/serviceAccountKey.json",
  "        (auto-detected and git-ignored — never commit it)",
  "",
  "  B) gcloud Application Default Credentials",
  "       gcloud auth application-default login",
  "       gcloud auth application-default set-quota-project dj-grain-hub",
  "",
  "  C) Local emulators (nothing real is touched)",
  "       firebase emulators:start --only firestore,storage",
  "       set FIRESTORE_EMULATOR_HOST=127.0.0.1:8080",
  "       set FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199",
  "",
].join("\n");

function isCredentialError(err) {
  const message = String((err && err.message) || err);
  return (
    /Could not load the default credentials/i.test(message) ||
    /Unable to detect a Project ?Id/i.test(message) ||
    /invalid_grant|invalid_rapt|reauth|UNAUTHENTICATED/i.test(message) ||
    (err && (err.code === 16 || err.code === 401))
  );
}

const BUCKET_NAME =
  sanitizeBucketName(process.env.FIREBASE_STORAGE_BUCKET) || "dj-grain-hub.firebasestorage.app";

const PROJECT_ID = resolveProjectId();
const SERVICE_ACCOUNT = USING_EMULATOR ? null : loadServiceAccount();

const appOptions = { storageBucket: BUCKET_NAME };
if (PROJECT_ID) appOptions.projectId = PROJECT_ID;
if (SERVICE_ACCOUNT) {
  appOptions.credential = admin.credential.cert(SERVICE_ACCOUNT.json);
  if (!appOptions.projectId && SERVICE_ACCOUNT.json.project_id) {
    appOptions.projectId = SERVICE_ACCOUNT.json.project_id;
  }
}

admin.initializeApp(appOptions);
const db = admin.firestore();

/** Fails fast with an actionable message instead of a raw google-auth stack trace. */
async function preflightCredentials() {
  if (USING_EMULATOR) {
    console.log(`🧪 Emulator mode — Firestore at ${process.env.FIRESTORE_EMULATOR_HOST}`);
    console.log(`📦 Project: ${appOptions.projectId || "(unresolved)"} · Bucket: ${BUCKET_NAME}\n`);
    return;
  }

  const authLabel = SERVICE_ACCOUNT
    ? `service account (${SERVICE_ACCOUNT.source})`
    : "application default credentials";
  console.log(`🔐 Auth: ${authLabel}`);
  console.log(`📦 Project: ${appOptions.projectId || "(unresolved)"} · Bucket: ${BUCKET_NAME}\n`);

  try {
    await db.collection("_seedPreflight").limit(1).get();
  } catch (err) {
    if (isCredentialError(err)) {
      const wrapped = new Error("Missing or invalid Google credentials");
      wrapped.help = CREDENTIAL_HELP;
      throw wrapped;
    }
    throw err;
  }
}

// ─── Product images ───────────────────────────────────────────────────

let bucketPromise;
/** Resolves the Storage bucket once, verifying it actually exists. */
function getBucket() {
  if (bucketPromise) return bucketPromise;

  bucketPromise = (async () => {
    try {
      const storageBucket = admin.storage().bucket(BUCKET_NAME);
      const emulated = USING_EMULATOR || Boolean(process.env.FIREBASE_STORAGE_EMULATOR_HOST);
      if (!emulated) {
        const [exists] = await storageBucket.exists();
        if (!exists) {
          console.warn(
            `  ⚠ Storage bucket "${BUCKET_NAME}" does not exist. Enable Firebase Storage or set ` +
              "FIREBASE_STORAGE_BUCKET. Product images will be skipped."
          );
          return null;
        }
      }
      return storageBucket;
    } catch (err) {
      console.warn(
        `  ⚠ Firebase Storage unavailable (bucket: ${BUCKET_NAME}). Product images will be skipped.`,
        err && err.message ? err.message : String(err)
      );
      return null;
    }
  })();

  return bucketPromise;
}

const IMAGE_DIR = path.join(__dirname, "..", "src", "assets");

const IMAGE_EXTENSIONS = [
  { ext: ".jpg", mimeType: "image/jpeg" },
  { ext: ".jpeg", mimeType: "image/jpeg" },
  { ext: ".png", mimeType: "image/png" },
  { ext: ".webp", mimeType: "image/webp" },
];

/** Reads src/assets/<slotNumber>.<ext> for a slot, if any such file exists. */
function getProductImage(slotNumber) {
  for (const { ext, mimeType } of IMAGE_EXTENSIONS) {
    const imagePath = path.join(IMAGE_DIR, `${slotNumber}${ext}`);
    try {
      if (fs.existsSync(imagePath)) {
        return { buffer: fs.readFileSync(imagePath), mimeType, imagePath };
      }
    } catch (err) {
      console.warn(`  ⚠ Could not read ${imagePath}:`, err.message);
    }
  }
  return null;
}

/**
 * Uploads one product image to products/<productId>/image and confirms the
 * object really landed. Returns the stored mime type.
 */
async function uploadProductImage(bucket, productId, image) {
  const file = bucket.file(`products/${productId}/image`);
  await file.save(image.buffer, {
    contentType: image.mimeType,
    resumable: false,
    metadata: { contentType: image.mimeType, cacheControl: "public, max-age=86400" },
  });

  const [exists] = await file.exists();
  if (!exists) throw new Error("upload finished but the object is missing from the bucket");

  return image.mimeType;
}

// ─── Source data ──────────────────────────────────────────────────────

const USERS = [
  { id: "u1", name: "Juan Dela Cruz",        email: "juan@djgrain.com",         username: "superadmin", password: "superadmin123", role: "Business Owner",   accessRole: "super_admin", status: "active",   ownedMachineId: null },
  { id: "u2", name: "Maria Santos",           email: "maria@retailstore.com",    username: "maria",       password: "admin123",      role: "Retail Operator",  accessRole: "admin",       status: "active",   ownedMachineId: "m2" },
  { id: "u3", name: "Pedro Reyes",            email: "pedro@retailstore2.com",   username: "pedro",       password: "pedro123",      role: "Retail Operator",  accessRole: "admin",       status: "inactive", ownedMachineId: "m3" },
  { id: "u4", name: "System Administrator",   email: "admin@djgrainhub.com",     username: "admin",       password: "123456",        role: "Retail Operator",  accessRole: "super_admin", status: "active",   ownedMachineId: null },
];

const MACHINES = [
  { id: "m1", name: "Machine 01 - SM Tanza",    location: "SM City Tanza, Tanza, Cavite",                       lat: 14.3953, lng: 120.8456, ownerId: "u1", status: "online",  capacity: 100, lastRefill: "2023-10-25T08:30:00Z", earnings: 12500, alertCount: 0 },
  { id: "m2", name: "Machine 02 - CvSU CCAT",   location: "Cavite State University CCAT, Rosario, Cavite",      lat: 14.4168, lng: 120.8530, ownerId: "u1", status: "warning", capacity: 100, lastRefill: "2023-10-20T14:15:00Z", earnings:  8900, alertCount: 1 },
  { id: "m3", name: "Machine 03 - Gen. Trias",  location: "Municipal Hall, General Trias, Cavite",              lat: 14.3843, lng: 120.8823, ownerId: "u1", status: "offline", capacity: 100, lastRefill: "2023-10-24T09:00:00Z", earnings: 15600, alertCount: 2 },
  { id: "m4", name: "Machine 04 - SM Bacoor",   location: "SM City Bacoor, Bacoor, Cavite",                     lat: 14.4284, lng: 120.9450, ownerId: "u4", status: "online",  capacity: 100, lastRefill: "2023-10-26T07:45:00Z", earnings:  9800, alertCount: 0 },
  { id: "m5", name: "Machine 05 - Quezon City", location: "Quezon City, Metro Manila",                          lat: 14.6760, lng: 121.0437, ownerId: "u1", status: "online",  capacity:  80, lastRefill: "2023-10-26T06:00:00Z", earnings:  6200, alertCount: 0 },
  { id: "m6", name: "Machine 06 - MOA",         location: "SM Mall of Asia, Pasay City, Metro Manila",          lat: 14.5351, lng: 120.9835, ownerId: "u4", status: "warning", capacity: 120, lastRefill: "2023-10-22T10:30:00Z", earnings: 11400, alertCount: 1 },
];

const PRODUCTS = [
  { id: "p1-m1", machineId: "m1", slotNumber: 1, name: "Premium Jasmine Rice", price: 275, cost: 180, weight: 1.0, stock: 45 },
  { id: "p2-m1", machineId: "m1", slotNumber: 2, name: "Standard White Rice",  price: 130, cost:  85, weight: 1.0, stock: 60 },
  { id: "p3-m1", machineId: "m1", slotNumber: 3, name: "Organic Brown Rice",   price: 400, cost: 260, weight: 1.0, stock: 30 },
  { id: "p4-m1", machineId: "m1", slotNumber: 4, name: "Glutinous Rice",       price:  50, cost:  32, weight: 0.5, stock: 80 },
  { id: "p5-m1", machineId: "m1", slotNumber: 5, name: "Sinandomeng Rice",     price: 240, cost: 155, weight: 1.0, stock: 50 },
  { id: "p6-m1", machineId: "m1", slotNumber: 6, name: "Dinorado Rice",        price: 210, cost: 135, weight: 1.0, stock: 40 },

  { id: "p1-m2", machineId: "m2", slotNumber: 1, name: "Premium Jasmine Rice", price: 275, cost: 180, weight: 1.0, stock:  8 },
  { id: "p2-m2", machineId: "m2", slotNumber: 2, name: "Standard White Rice",  price:  50, cost:  32, weight: 0.5, stock: 12 },
  { id: "p3-m2", machineId: "m2", slotNumber: 3, name: "Organic Brown Rice",   price: 400, cost: 260, weight: 1.0, stock:  5 },
  { id: "p4-m2", machineId: "m2", slotNumber: 4, name: "Glutinous Rice",       price:  90, cost:  58, weight: 0.5, stock:  7 },
  { id: "p5-m2", machineId: "m2", slotNumber: 5, name: "Sinandomeng Rice",     price: 240, cost: 155, weight: 1.0, stock:  3 },
  { id: "p6-m2", machineId: "m2", slotNumber: 6, name: "Dinorado Rice",        price: 116, cost:  75, weight: 0.5, stock:  4 },

  { id: "p1-m3", machineId: "m3", slotNumber: 1, name: "Premium Jasmine Rice", price: 275, cost: 180, weight: 1.0, stock: 20 },
  { id: "p2-m3", machineId: "m3", slotNumber: 2, name: "Standard White Rice",  price: 130, cost:  85, weight: 1.0, stock: 35 },
  { id: "p3-m3", machineId: "m3", slotNumber: 3, name: "Organic Brown Rice",   price: 400, cost: 260, weight: 1.0, stock: 18 },
  { id: "p4-m3", machineId: "m3", slotNumber: 4, name: "Glutinous Rice",       price:  50, cost:  32, weight: 0.5, stock: 42 },
  { id: "p5-m3", machineId: "m3", slotNumber: 5, name: "Sinandomeng Rice",     price: 240, cost: 155, weight: 1.0, stock: 25 },
  { id: "p6-m3", machineId: "m3", slotNumber: 6, name: "Dinorado Rice",        price: 210, cost: 135, weight: 1.0, stock: 15 },

  { id: "p1-m4", machineId: "m4", slotNumber: 1, name: "Premium Jasmine Rice", price: 275, cost: 180, weight: 1.0, stock: 55 },
  { id: "p2-m4", machineId: "m4", slotNumber: 2, name: "Standard White Rice",  price: 130, cost:  85, weight: 1.0, stock: 70 },
  { id: "p3-m4", machineId: "m4", slotNumber: 3, name: "Organic Brown Rice",   price: 400, cost: 260, weight: 1.0, stock: 38 },
  { id: "p4-m4", machineId: "m4", slotNumber: 4, name: "Glutinous Rice",       price:  50, cost:  32, weight: 0.5, stock: 90 },
  { id: "p5-m4", machineId: "m4", slotNumber: 5, name: "Sinandomeng Rice",     price: 240, cost: 155, weight: 1.0, stock: 60 },
  { id: "p6-m4", machineId: "m4", slotNumber: 6, name: "Dinorado Rice",        price: 210, cost: 135, weight: 1.0, stock: 48 },

  { id: "p1-m5", machineId: "m5", slotNumber: 1, name: "Premium Jasmine Rice", price: 275, cost: 180, weight: 1.0, stock: 30 },
  { id: "p2-m5", machineId: "m5", slotNumber: 2, name: "Standard White Rice",  price: 130, cost:  85, weight: 1.0, stock: 45 },
  { id: "p3-m5", machineId: "m5", slotNumber: 3, name: "Organic Brown Rice",   price: 400, cost: 260, weight: 1.0, stock: 22 },
  { id: "p4-m5", machineId: "m5", slotNumber: 4, name: "Glutinous Rice",       price:  50, cost:  32, weight: 0.5, stock: 65 },
  { id: "p5-m5", machineId: "m5", slotNumber: 5, name: "Sinandomeng Rice",     price: 240, cost: 155, weight: 1.0, stock: 35 },
  { id: "p6-m5", machineId: "m5", slotNumber: 6, name: "Dinorado Rice",        price: 210, cost: 135, weight: 1.0, stock: 28 },

  { id: "p1-m6", machineId: "m6", slotNumber: 1, name: "Premium Jasmine Rice", price: 275, cost: 180, weight: 1.0, stock: 10 },
  { id: "p2-m6", machineId: "m6", slotNumber: 2, name: "Standard White Rice",  price: 130, cost:  85, weight: 1.0, stock: 18 },
  { id: "p3-m6", machineId: "m6", slotNumber: 3, name: "Organic Brown Rice",   price: 400, cost: 260, weight: 1.0, stock:  3 },
  { id: "p4-m6", machineId: "m6", slotNumber: 4, name: "Glutinous Rice",       price:  50, cost:  32, weight: 0.5, stock: 20 },
  { id: "p5-m6", machineId: "m6", slotNumber: 5, name: "Sinandomeng Rice",     price: 240, cost: 155, weight: 1.0, stock: 14 },
  { id: "p6-m6", machineId: "m6", slotNumber: 6, name: "Dinorado Rice",        price: 210, cost: 135, weight: 1.0, stock:  9 },
];

const ALERTS = [
  { id: "a1", machineId: "m2", type: "stock",       severity: "high",     message: "Low stock alert — all hoppers below 20%",                 timestamp: "2023-10-26T08:00:00Z", status: "active" },
  { id: "a2", machineId: "m3", type: "connection",  severity: "critical", message: "Connection lost for > 1 hour",                             timestamp: "2023-10-25T18:00:00Z", status: "active" },
  { id: "a3", machineId: "m3", type: "maintenance", severity: "medium",   message: "Coin dispenser jam detected",                              timestamp: "2023-10-25T17:45:00Z", status: "resolved" },
  { id: "a4", machineId: "m6", type: "stock",       severity: "high",     message: "Organic Brown hopper nearly empty (3 kg remaining)",       timestamp: "2023-10-26T14:00:00Z", status: "active" },
];

const REPORTS = [
  { id: "r1", machineId: "m1", category: "Machine Jam",     message: "Dispense slot 3 jammed. Paid but no rice came out.",              reporterName: "John Doe",     reporterMobile: "09171234567", timestamp: "2026-03-20T08:15:00Z", status: "open" },
  { id: "r2", machineId: "m2", category: "Payment Issue",   message: "QR payment succeeded but machine still shows pending.",           reporterName: "Maria Santos", reporterMobile: "09189998888", timestamp: "2026-03-20T09:30:00Z", status: "open" },
  { id: "r3", machineId: "m1", category: "Display Problem", message: "Touchscreen lower-right area is not responding.",                 reporterName: "Elena Torres", reporterMobile: "09213334444", timestamp: "2026-03-19T11:20:00Z", status: "open" },
  { id: "r4", machineId: "m2", category: "Product Quality", message: "Rice from slot 2 looked stale and had odd smell.",               reporterName: "Ricardo Gomez", reporterMobile: "09201112222", timestamp: "2026-03-18T14:45:00Z", status: "resolved" },
];

// ─── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Starting Firestore seed...\n");

  await preflightCredentials();

  // ── Users ──────────────────────────────────────────────────────────
  console.log("👤 Seeding users...");
  for (const u of USERS) {
    const hashed = await bcrypt.hash(u.password, 10);
    const ts = new Date().toISOString();
    await db.collection("users").doc(u.id).set({
      name: u.name, email: u.email, username: u.username,
      password: hashed, role: u.role, accessRole: u.accessRole,
      status: u.status, ownedMachineId: u.ownedMachineId,
      createdAt: ts, updatedAt: ts,
    }, { merge: true });
    console.log(`  ✓ ${u.username} (${u.accessRole})`);
  }

  // ── Machines ───────────────────────────────────────────────────────
  console.log("\n🏭 Seeding machines...");
  for (const m of MACHINES) {
    const ts = new Date().toISOString();
    await db.collection("machines").doc(m.id).set({
      name: m.name, location: m.location, lat: m.lat, lng: m.lng,
      ownerId: m.ownerId, status: m.status, capacity: m.capacity,
      lastRefill: m.lastRefill, earnings: m.earnings, alertCount: m.alertCount,
      createdAt: ts, updatedAt: ts,
    }, { merge: true });
    console.log(`  ✓ ${m.name}`);
  }

  // ── Products (+ images) ────────────────────────────────────────────
  console.log("\n🌾 Seeding products...");

  const bucket = SKIP_IMAGES ? null : await getBucket();
  const imageStats = { uploaded: 0, skipped: 0, failed: 0, missingSlots: new Set() };

  for (const p of PRODUCTS) {
    const ts = new Date().toISOString();
    const image = getProductImage(p.slotNumber);
    let uploadedMimeType = null;

    if (!image) {
      imageStats.missingSlots.add(p.slotNumber);
    } else if (!bucket) {
      imageStats.skipped++;
    } else {
      try {
        uploadedMimeType = await uploadProductImage(bucket, p.id, image);
        imageStats.uploaded++;
      } catch (err) {
        imageStats.failed++;
        console.warn(`  ⚠ Image upload failed for ${p.id}:`, err.message);
      }
    }

    const data = {
      machineId: p.machineId, slotNumber: p.slotNumber, name: p.name,
      price: p.price, cost: p.cost, weight: p.weight, stock: p.stock,
      createdAt: ts, updatedAt: ts,
    };

    // imageUrl stays null: the app reads the bytes back through
    // GET /api/products/:id/image, which only serves them when imageMimeType
    // is set. Claim the image only after a confirmed upload, so a failure
    // never leaves a product pointing at a missing object.
    if (uploadedMimeType) {
      data.imageUrl = null;
      data.imageMimeType = uploadedMimeType;
    }

    await db.collection("products").doc(p.id).set(data, { merge: true });
  }

  console.log(`  ✓ ${PRODUCTS.length} products across ${MACHINES.length} machines`);

  if (SKIP_IMAGES) {
    console.log("  ↷ Images skipped (--skip-images)");
  } else {
    console.log(`  🖼 Images uploaded: ${imageStats.uploaded}/${PRODUCTS.length}`);
    if (imageStats.skipped) {
      console.warn(`  ⚠ ${imageStats.skipped} image(s) skipped — Storage bucket unavailable`);
    }
    if (imageStats.failed) {
      console.warn(`  ⚠ ${imageStats.failed} image upload(s) failed`);
    }
  }
  if (imageStats.missingSlots.size) {
    const slots = [...imageStats.missingSlots].sort((a, b) => a - b).join(", ");
    console.warn(`  ⚠ No source image for slot(s) ${slots} — expected <slot>.jpg in ${IMAGE_DIR}`);
  }

  // ── Alerts ─────────────────────────────────────────────────────────
  console.log("\n🚨 Seeding alerts...");
  for (const a of ALERTS) {
    await db.collection("alerts").doc(a.id).set({
      machineId: a.machineId, type: a.type, severity: a.severity,
      message: a.message, status: a.status,
      timestamp: a.timestamp, createdAt: a.timestamp,
    }, { merge: true });
    console.log(`  ✓ [${a.severity.toUpperCase()}] ${a.type} — ${a.machineId}`);
  }

  // ── Reports ────────────────────────────────────────────────────────
  console.log("\n📋 Seeding reports...");
  for (const r of REPORTS) {
    await db.collection("reports").doc(r.id).set({
      machineId: r.machineId, category: r.category, message: r.message,
      reporterName: r.reporterName, reporterMobile: r.reporterMobile,
      status: r.status, timestamp: r.timestamp, createdAt: r.timestamp,
    }, { merge: true });
  }
  console.log(`  ✓ ${REPORTS.length} reports`);

  // ── Notification Preferences ───────────────────────────────────────
  console.log("\n🔔 Seeding notification preferences...");
  for (const u of USERS) {
    const ts = new Date().toISOString();
    await db.collection("notificationPrefs").doc(u.id).set({
      userId: u.id, machineAlerts: true, stockAlerts: true, dailySummary: false,
      createdAt: ts, updatedAt: ts,
    }, { merge: true });
  }
  console.log(`  ✓ Preferences set for ${USERS.length} users`);

  const imagesIncomplete = !SKIP_IMAGES && (imageStats.failed > 0 || imageStats.skipped > 0);

  if (imagesIncomplete) {
    console.log("\n⚠️  Firestore seed finished, but some product images were not uploaded.");
  } else {
    console.log("\n✅ Firestore seed complete!");
  }

  console.log("\n📝 Login credentials:");
  for (const u of USERS) {
    console.log(`  ${u.username.padEnd(12)} → ${u.password}  (${u.accessRole})`);
  }

  return imagesIncomplete ? 1 : 0;
}

main()
  .then((exitCode) => process.exit(exitCode || 0))
  .catch((err) => {
    console.error(`❌ Seed failed: ${(err && err.message) || err}`);
    if (err && err.help) {
      console.error(err.help);
    } else if (err && err.stack) {
      console.error(err.stack);
    }
    process.exit(1);
  });
