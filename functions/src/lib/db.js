const admin = require("firebase-admin");

// Default bucket for this project. Cloud Functions supplies storageBucket via
// FIREBASE_CONFIG at runtime, but the deploy-time source analysis does not, so
// admin.storage().bucket() would throw while the CLI loads this module.
// Same env var + fallback used by seed.js.
const BUCKET_NAME =
  process.env.FIREBASE_STORAGE_BUCKET || "dj-grain-hub.firebasestorage.app";

if (!admin.apps.length) {
  admin.initializeApp({ storageBucket: BUCKET_NAME });
}

const db = admin.firestore();
const bucket = admin.storage().bucket(BUCKET_NAME);

/**
 * Convert a Firestore DocumentSnapshot to a plain JS object.
 * Firestore Timestamps are converted to ISO strings so JSON serialization
 * matches what Prisma previously returned.
 */
function docToObj(doc) {
  if (!doc.exists) return null;
  const data = doc.data();
  const obj = { id: doc.id };
  for (const [key, val] of Object.entries(data)) {
    if (val && typeof val.toDate === "function") {
      obj[key] = val.toDate().toISOString();
    } else {
      obj[key] = val;
    }
  }
  return obj;
}

/** Convert a QuerySnapshot to an array of plain objects. */
function docsToArr(snapshot) {
  return snapshot.docs.map(docToObj);
}

/** Current ISO timestamp string. */
function now() {
  return new Date().toISOString();
}

module.exports = { db, bucket, admin, docToObj, docsToArr, now };
