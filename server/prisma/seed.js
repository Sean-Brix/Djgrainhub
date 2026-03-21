/**
 * Prisma Seed — DJ Grain Hub
 *
 * Populates the database from the original JSON data files.
 * Run with:  node prisma/seed.js
 * Or add "prisma": { "seed": "node prisma/seed.js" } to package.json
 * and use:   npx prisma db seed
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");
const fs = require("fs");
const path = require("path");

const prisma = new PrismaClient();

// ─── Load Product Images ─────────────────────────────────────────────
// Maps slot numbers to their corresponding image files
const IMAGE_DIR = path.join(__dirname, "..", "..", "src", "assets");

function getProductImage(slotNumber) {
  try {
    const imagePath = path.join(IMAGE_DIR, `${slotNumber}.jpg`);
    if (fs.existsSync(imagePath)) {
      return {
        blob: fs.readFileSync(imagePath),
        mimeType: "image/jpeg",
      };
    }
  } catch (err) {
    console.warn(`  ⚠ Could not load image for slot ${slotNumber}:`, err.message);
  }
  return null;
}

// ─── Source data (ported from src/db/*.json) ────────────────────────

const USERS = [
  {
    id: "u1",
    name: "Juan Dela Cruz",
    email: "juan@djgrain.com",
    username: "superadmin",
    password: "superadmin123",
    role: "Business Owner",
    accessRole: "super_admin",
    status: "active",
    ownedMachineId: null,
  },
  {
    id: "u2",
    name: "Maria Santos",
    email: "maria@retailstore.com",
    username: "maria",
    password: "admin123",
    role: "Retail Operator",
    accessRole: "admin",
    status: "active",
    ownedMachineId: "m2",
  },
  {
    id: "u3",
    name: "Pedro Reyes",
    email: "pedro@retailstore2.com",
    username: "pedro",
    password: "pedro123",
    role: "Retail Operator",
    accessRole: "admin",
    status: "inactive",
    ownedMachineId: "m3",
  },
  {
    id: "u4",
    name: "System Administrator",
    email: "admin@djgrainhub.com",
    username: "admin",
    password: "123456",
    role: "Retail Operator",
    accessRole: "super_admin",
    status: "active",
    ownedMachineId: null,
  },
];

const MACHINES = [
  {
    id: "m1",
    name: "Machine 01 - SM Tanza",
    location: "SM City Tanza, Tanza, Cavite",
    lat: 14.3953,
    lng: 120.8456,
    ownerId: "u1",
    status: "online",
    capacity: 100,
    lastRefill: new Date("2023-10-25T08:30:00Z"),
    earnings: 12500,
    alertCount: 0,
  },
  {
    id: "m2",
    name: "Machine 02 - CvSU CCAT",
    location: "Cavite State University CCAT, Rosario, Cavite",
    lat: 14.4168,
    lng: 120.853,
    ownerId: "u1",
    status: "warning",
    capacity: 100,
    lastRefill: new Date("2023-10-20T14:15:00Z"),
    earnings: 8900,
    alertCount: 1,
  },
  {
    id: "m3",
    name: "Machine 03 - Gen. Trias",
    location: "Municipal Hall, General Trias, Cavite",
    lat: 14.3843,
    lng: 120.8823,
    ownerId: "u1",
    status: "offline",
    capacity: 100,
    lastRefill: new Date("2023-10-24T09:00:00Z"),
    earnings: 15600,
    alertCount: 2,
  },
  {
    id: "m4",
    name: "Machine 04 - SM Bacoor",
    location: "SM City Bacoor, Bacoor, Cavite",
    lat: 14.4284,
    lng: 120.945,
    ownerId: "u4",
    status: "online",
    capacity: 100,
    lastRefill: new Date("2023-10-26T07:45:00Z"),
    earnings: 9800,
    alertCount: 0,
  },
  {
    id: "m5",
    name: "Machine 05 - Quezon City",
    location: "Quezon City, Metro Manila",
    lat: 14.676,
    lng: 121.0437,
    ownerId: "u1",
    status: "online",
    capacity: 80,
    lastRefill: new Date("2023-10-26T06:00:00Z"),
    earnings: 6200,
    alertCount: 0,
  },
  {
    id: "m6",
    name: "Machine 06 - MOA",
    location: "SM Mall of Asia, Pasay City, Metro Manila",
    lat: 14.5351,
    lng: 120.9835,
    ownerId: "u4",
    status: "warning",
    capacity: 120,
    lastRefill: new Date("2023-10-22T10:30:00Z"),
    earnings: 11400,
    alertCount: 1,
  },
];

// Products per machine — 6 slots each
// Prices inferred from sales data (p1-m1: 5 units = 1375 → 275/unit, etc.)
const PRODUCTS = [
  // ── Machine 1 ──────────────────────────────────────────────────────
  { id: "p1-m1", machineId: "m1", slotNumber: 1, name: "Premium Jasmine Rice",  price: 275, cost: 180, weight: 1.0, stock: 45, imageUrl: "" },
  { id: "p2-m1", machineId: "m1", slotNumber: 2, name: "Standard White Rice",   price: 130, cost:  85, weight: 1.0, stock: 60, imageUrl: "" },
  { id: "p3-m1", machineId: "m1", slotNumber: 3, name: "Organic Brown Rice",    price: 400, cost: 260, weight: 1.0, stock: 30, imageUrl: "" },
  { id: "p4-m1", machineId: "m1", slotNumber: 4, name: "Glutinous Rice",        price:  50, cost:  32, weight: 0.5, stock: 80, imageUrl: "" },
  { id: "p5-m1", machineId: "m1", slotNumber: 5, name: "Sinandomeng Rice",      price: 240, cost: 155, weight: 1.0, stock: 50, imageUrl: "" },
  { id: "p6-m1", machineId: "m1", slotNumber: 6, name: "Dinorado Rice",         price: 210, cost: 135, weight: 1.0, stock: 40, imageUrl: "" },

  // ── Machine 2 ──────────────────────────────────────────────────────
  { id: "p1-m2", machineId: "m2", slotNumber: 1, name: "Premium Jasmine Rice",  price: 275, cost: 180, weight: 1.0, stock:  8, imageUrl: "" },
  { id: "p2-m2", machineId: "m2", slotNumber: 2, name: "Standard White Rice",   price:  50, cost:  32, weight: 0.5, stock: 12, imageUrl: "" },
  { id: "p3-m2", machineId: "m2", slotNumber: 3, name: "Organic Brown Rice",    price: 400, cost: 260, weight: 1.0, stock:  5, imageUrl: "" },
  { id: "p4-m2", machineId: "m2", slotNumber: 4, name: "Glutinous Rice",        price:  90, cost:  58, weight: 0.5, stock:  7, imageUrl: "" },
  { id: "p5-m2", machineId: "m2", slotNumber: 5, name: "Sinandomeng Rice",      price: 240, cost: 155, weight: 1.0, stock:  3, imageUrl: "" },
  { id: "p6-m2", machineId: "m2", slotNumber: 6, name: "Dinorado Rice",         price: 116, cost:  75, weight: 0.5, stock:  4, imageUrl: "" },

  // ── Machine 3 ──────────────────────────────────────────────────────
  { id: "p1-m3", machineId: "m3", slotNumber: 1, name: "Premium Jasmine Rice",  price: 275, cost: 180, weight: 1.0, stock: 20, imageUrl: "" },
  { id: "p2-m3", machineId: "m3", slotNumber: 2, name: "Standard White Rice",   price: 130, cost:  85, weight: 1.0, stock: 35, imageUrl: "" },
  { id: "p3-m3", machineId: "m3", slotNumber: 3, name: "Organic Brown Rice",    price: 400, cost: 260, weight: 1.0, stock: 18, imageUrl: "" },
  { id: "p4-m3", machineId: "m3", slotNumber: 4, name: "Glutinous Rice",        price:  50, cost:  32, weight: 0.5, stock: 42, imageUrl: "" },
  { id: "p5-m3", machineId: "m3", slotNumber: 5, name: "Sinandomeng Rice",      price: 240, cost: 155, weight: 1.0, stock: 25, imageUrl: "" },
  { id: "p6-m3", machineId: "m3", slotNumber: 6, name: "Dinorado Rice",         price: 210, cost: 135, weight: 1.0, stock: 15, imageUrl: "" },

  // ── Machine 4 ──────────────────────────────────────────────────────
  { id: "p1-m4", machineId: "m4", slotNumber: 1, name: "Premium Jasmine Rice",  price: 275, cost: 180, weight: 1.0, stock: 55, imageUrl: "" },
  { id: "p2-m4", machineId: "m4", slotNumber: 2, name: "Standard White Rice",   price: 130, cost:  85, weight: 1.0, stock: 70, imageUrl: "" },
  { id: "p3-m4", machineId: "m4", slotNumber: 3, name: "Organic Brown Rice",    price: 400, cost: 260, weight: 1.0, stock: 38, imageUrl: "" },
  { id: "p4-m4", machineId: "m4", slotNumber: 4, name: "Glutinous Rice",        price:  50, cost:  32, weight: 0.5, stock: 90, imageUrl: "" },
  { id: "p5-m4", machineId: "m4", slotNumber: 5, name: "Sinandomeng Rice",      price: 240, cost: 155, weight: 1.0, stock: 60, imageUrl: "" },
  { id: "p6-m4", machineId: "m4", slotNumber: 6, name: "Dinorado Rice",         price: 210, cost: 135, weight: 1.0, stock: 48, imageUrl: "" },

  // ── Machine 5 ──────────────────────────────────────────────────────
  { id: "p1-m5", machineId: "m5", slotNumber: 1, name: "Premium Jasmine Rice",  price: 275, cost: 180, weight: 1.0, stock: 30, imageUrl: "" },
  { id: "p2-m5", machineId: "m5", slotNumber: 2, name: "Standard White Rice",   price: 130, cost:  85, weight: 1.0, stock: 45, imageUrl: "" },
  { id: "p3-m5", machineId: "m5", slotNumber: 3, name: "Organic Brown Rice",    price: 400, cost: 260, weight: 1.0, stock: 22, imageUrl: "" },
  { id: "p4-m5", machineId: "m5", slotNumber: 4, name: "Glutinous Rice",        price:  50, cost:  32, weight: 0.5, stock: 65, imageUrl: "" },
  { id: "p5-m5", machineId: "m5", slotNumber: 5, name: "Sinandomeng Rice",      price: 240, cost: 155, weight: 1.0, stock: 35, imageUrl: "" },
  { id: "p6-m5", machineId: "m5", slotNumber: 6, name: "Dinorado Rice",         price: 210, cost: 135, weight: 1.0, stock: 28, imageUrl: "" },

  // ── Machine 6 ──────────────────────────────────────────────────────
  { id: "p1-m6", machineId: "m6", slotNumber: 1, name: "Premium Jasmine Rice",  price: 275, cost: 180, weight: 1.0, stock: 10, imageUrl: "" },
  { id: "p2-m6", machineId: "m6", slotNumber: 2, name: "Standard White Rice",   price: 130, cost:  85, weight: 1.0, stock: 18, imageUrl: "" },
  { id: "p3-m6", machineId: "m6", slotNumber: 3, name: "Organic Brown Rice",    price: 400, cost: 260, weight: 1.0, stock:  3, imageUrl: "" },
  { id: "p4-m6", machineId: "m6", slotNumber: 4, name: "Glutinous Rice",        price:  50, cost:  32, weight: 0.5, stock: 20, imageUrl: "" },
  { id: "p5-m6", machineId: "m6", slotNumber: 5, name: "Sinandomeng Rice",      price: 240, cost: 155, weight: 1.0, stock: 14, imageUrl: "" },
  { id: "p6-m6", machineId: "m6", slotNumber: 6, name: "Dinorado Rice",         price: 210, cost: 135, weight: 1.0, stock:  9, imageUrl: "" },
];

// Keep transactions empty in seed so dashboards start from live data only.
const RAW_SALES = [];

const ALERTS = [
  { id: "a1", machineId: "m2", type: "stock",       severity: "high",     message: "Low stock alert — all hoppers below 20%",                   timestamp: "2023-10-26T08:00:00Z", status: "active" },
  { id: "a2", machineId: "m3", type: "connection",  severity: "critical", message: "Connection lost for > 1 hour",                               timestamp: "2023-10-25T18:00:00Z", status: "active" },
  { id: "a3", machineId: "m3", type: "maintenance", severity: "medium",   message: "Coin dispenser jam detected",                                timestamp: "2023-10-25T17:45:00Z", status: "resolved" },
  { id: "a4", machineId: "m6", type: "stock",       severity: "high",     message: "Organic Brown hopper nearly empty (3 kg remaining)",         timestamp: "2023-10-26T14:00:00Z", status: "active" },
];

const REPORTS = [
  { id: "r1", machineId: "m1", category: "Machine Jam", message: "Dispense slot 3 jammed. Paid but no rice came out.", name: "John Doe", mobileNumber: "09171234567", timestamp: "2026-03-20T08:15:00Z", status: "open" },
  { id: "r2", machineId: "m2", category: "Payment Issue", message: "QR payment succeeded but machine still shows pending.", name: "Maria Santos", mobileNumber: "09189998888", timestamp: "2026-03-20T09:30:00Z", status: "open" },
  { id: "r3", machineId: "m1", category: "Display Problem", message: "Touchscreen lower-right area is not responding.", name: "Elena Torres", mobileNumber: "09213334444", timestamp: "2026-03-19T11:20:00Z", status: "open" },
  { id: "r4", machineId: "m2", category: "Product Quality", message: "Rice from slot 2 looked stale and had odd smell.", name: "Ricardo Gomez", mobileNumber: "09201112222", timestamp: "2026-03-18T14:45:00Z", status: "resolved" },
];

// ─── Main ─────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Starting seed...\n");

  // ── Users ──────────────────────────────────────────────────────────
  console.log("👤 Seeding users...");
  for (const u of USERS) {
    const hashed = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { id: u.id },
      update: {},
      create: {
        id:             u.id,
        name:           u.name,
        email:          u.email,
        username:       u.username,
        password:       hashed,
        role:           u.role,
        accessRole:     u.accessRole,
        status:         u.status,
        ownedMachineId: u.ownedMachineId,
      },
    });
    console.log(`  ✓ ${u.username} (${u.accessRole})`);
  }

  // ── Machines ───────────────────────────────────────────────────────
  console.log("\n🏭 Seeding machines...");
  for (const m of MACHINES) {
    await prisma.machine.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id:          m.id,
        name:        m.name,
        location:    m.location,
        lat:         m.lat,
        lng:         m.lng,
        ownerId:     m.ownerId,
        status:      m.status,
        capacity:    m.capacity,
        lastRefill:  m.lastRefill,
        earnings:    m.earnings,
        alertCount:  m.alertCount,
      },
    });
    console.log(`  ✓ ${m.name}`);
  }

  // ── Products ───────────────────────────────────────────────────────
  console.log("\n🌾 Seeding products...");
  for (const p of PRODUCTS) {
    const imageData = getProductImage(p.slotNumber);
    
    await prisma.product.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id:            p.id,
        machineId:     p.machineId,
        slotNumber:    p.slotNumber,
        name:          p.name,
        price:         p.price,
        cost:          p.cost,
        weight:        p.weight,
        stock:         p.stock,
        imageUrl:      p.imageUrl,
        imageBlob:     imageData?.blob || null,
        imageMimeType: imageData?.mimeType || null,
      },
    });
  }
  console.log(`  ✓ ${PRODUCTS.length} products across ${MACHINES.length} machines`);

  // ── Sales + Sale Items ──────────────────────────────────────────────
  console.log("\n🧾 Resetting transactions...");
  await prisma.saleItem.deleteMany({});
  await prisma.sale.deleteMany({});
  console.log("  ✓ Transactions cleared (0 seeded)");

  // ── Alerts ─────────────────────────────────────────────────────────
  console.log("\n🚨 Seeding alerts...");
  for (const a of ALERTS) {
    await prisma.alert.upsert({
      where: { id: a.id },
      update: {},
      create: {
        id:        a.id,
        machineId: a.machineId,
        type:      a.type,
        severity:  a.severity,
        message:   a.message,
        timestamp: new Date(a.timestamp),
        status:    a.status,
      },
    });
    console.log(`  ✓ [${a.severity.toUpperCase()}] ${a.type} — ${a.machineId}`);
  }

  // ── Reports ────────────────────────────────────────────────────────
  console.log("\n📋 Seeding reports...");
  await prisma.todoItem.deleteMany({});
  await prisma.report.deleteMany({});
  for (const r of REPORTS) {
    const reporterName = (r.name || '').trim();
    const reporterMobile = (r.mobileNumber || '').trim();

    await prisma.report.upsert({
      where: { id: r.id },
      update: {
        machineId:      r.machineId,
        category:       r.category,
        message:        r.message,
        reporterName,
        reporterMobile,
        timestamp:      new Date(r.timestamp),
        status:         r.status,
      },
      create: {
        id:             r.id,
        machineId:      r.machineId,
        category:       r.category,
        message:        r.message,
        reporterName,
        reporterMobile,
        timestamp:      new Date(r.timestamp),
        status:         r.status,
      },
    });
  }
  console.log(`  ✓ ${REPORTS.length} reports`);

  // ── Notification Preferences (default for all users) ───────────────
  console.log("\n🔔 Seeding notification preferences...");
  for (const u of USERS) {
    await prisma.notificationPreference.upsert({
      where: { userId: u.id },
      update: {},
      create: {
        userId:        u.id,
        machineAlerts: true,
        stockAlerts:   true,
        dailySummary:  false,
      },
    });
  }
  console.log(`  ✓ Preferences set for ${USERS.length} users`);

  console.log("\n✅ Seed complete!");
  console.log("\n📝 Login credentials:");
  for (const u of USERS) {
    console.log(`  ${u.username.padEnd(12)} → ${u.password}  (${u.accessRole})`);
  }
}

main()
  .catch(err => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
