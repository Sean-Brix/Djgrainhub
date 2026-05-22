const { db, bucket, docToObj, now } = require("../lib/db");
const admin = require("firebase-admin");

function productSelect(doc) {
  const p = docToObj(doc);
  if (p) delete p.imageBlob; // never return raw blob bytes over the API
  return p;
}

function bySlotNumber(a, b) {
  return (a.slotNumber || 0) - (b.slotNumber || 0);
}

// ─── GET /api/machines/:machineId/products ────────────────────────────
async function getProductsByMachine(req, res) {
  const { machineId } = req.params;
  const snap = await db.collection("products").where("machineId", "==", machineId).get();
  return res.json(snap.docs.map(productSelect).sort(bySlotNumber));
}

// ─── POST /api/machines/:machineId/products ───────────────────────────
async function createProduct(req, res) {
  const { machineId } = req.params;
  const { slotNumber, name, price, cost, weight, stock, imageUrl } = req.body;

  if (!slotNumber || !name || price == null || cost == null || weight == null) {
    return res.status(400).json({ error: "slotNumber, name, price, cost, and weight are required" });
  }

  // Enforce one product per slot
  const existingSnap = await db.collection("products")
    .where("machineId", "==", machineId)
    .where("slotNumber", "==", parseInt(slotNumber))
    .limit(1)
    .get();
  if (!existingSnap.empty) {
    return res.status(409).json({ error: `Slot ${slotNumber} is already occupied` });
  }

  const ts = now();
  const docRef = db.collection("products").doc();

  // Resolve image
  const imageData = await resolveImageData(req.file, imageUrl, docRef.id);

  await docRef.set({
    machineId,
    slotNumber: parseInt(slotNumber),
    name,
    price: parseFloat(price),
    cost: parseFloat(cost),
    weight: parseFloat(weight),
    stock: stock ? parseInt(stock) : 0,
    imageUrl: imageData.imageUrl ?? null,
    imageMimeType: imageData.imageMimeType ?? null,
    createdAt: ts,
    updatedAt: ts,
  });

  return res.status(201).json(productSelect(await docRef.get()));
}

// ─── PATCH /api/products/:id ──────────────────────────────────────────
async function updateProduct(req, res) {
  const { id } = req.params;
  const { name, price, cost, weight, stock, imageUrl, slotNumber } = req.body;

  const data = { updatedAt: now() };
  if (name !== undefined) data.name = name;
  if (price !== undefined) data.price = parseFloat(price);
  if (cost !== undefined) data.cost = parseFloat(cost);
  if (weight !== undefined) data.weight = parseFloat(weight);
  if (stock !== undefined) data.stock = parseInt(stock);
  if (slotNumber !== undefined) data.slotNumber = parseInt(slotNumber);

  const imageData = await resolveImageData(req.file, imageUrl, id);
  if (imageData.imageUrl !== undefined) data.imageUrl = imageData.imageUrl;
  if (imageData.imageMimeType !== undefined) data.imageMimeType = imageData.imageMimeType;

  await db.collection("products").doc(id).update(data);
  return res.json(productSelect(await db.collection("products").doc(id).get()));
}

// ─── DELETE /api/products/:id ─────────────────────────────────────────
async function deleteProduct(req, res) {
  const { id } = req.params;
  await db.collection("products").doc(id).delete();
  // Best-effort cleanup of Storage file
  try {
    await bucket.file(`products/${id}/image`).delete();
  } catch {
    // File may not exist — ignore
  }
  return res.json({ message: "Product deleted" });
}

// ─── PATCH /api/products/:id/stock ───────────────────────────────────
async function decrementStock(req, res) {
  const { id } = req.params;
  const { quantity } = req.body;

  if (!quantity || quantity <= 0) {
    return res.status(400).json({ error: "quantity must be a positive number" });
  }

  const doc = await db.collection("products").doc(id).get();
  if (!doc.exists) return res.status(404).json({ error: "Product not found" });

  const product = docToObj(doc);
  const newStock = Math.max(0, product.stock - quantity);

  await db.collection("products").doc(id).update({ stock: newStock, updatedAt: now() });

  // Low-stock alert
  if (newStock <= 3 && product.stock > 3) {
    const ts = now();
    await db.collection("alerts").add({
      machineId: product.machineId,
      type: "stock",
      severity: newStock === 0 ? "critical" : "high",
      message: `${product.name} (Slot ${product.slotNumber}) is ${newStock === 0 ? "out of stock" : "critically low"} — ${newStock} unit(s) remaining`,
      status: "active",
      timestamp: ts,
      createdAt: ts,
    });
    await db.collection("machines").doc(product.machineId).update({
      alertCount: admin.firestore.FieldValue.increment(1),
    });
  }

  const updated = docToObj(await db.collection("products").doc(id).get());
  return res.json(updated);
}

// ─── POST /api/products/:id/image ────────────────────────────────────
async function uploadProductImage(req, res) {
  const { id } = req.params;
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded (field name must be 'image')" });
  }

  const doc = await db.collection("products").doc(id).get();
  if (!doc.exists) return res.status(404).json({ error: "Product not found" });

  await saveImageToStorage(id, req.file.buffer, req.file.mimetype);
  await db.collection("products").doc(id).update({
    imageMimeType: req.file.mimetype,
    imageUrl: null, // signals "stored in Firebase Storage, use /image endpoint"
    updatedAt: now(),
  });

  return res.json({ id, imageMimeType: req.file.mimetype, size: req.file.size });
}

// ─── GET /api/products/:id/image ─────────────────────────────────────
async function getProductImage(req, res) {
  const doc = await db.collection("products").doc(req.params.id).get();
  if (!doc.exists) return res.status(404).json({ error: "No image found for this product" });

  const product = docToObj(doc);

  // If there's a direct URL, redirect to it
  if (product.imageUrl) {
    return res.redirect(product.imageUrl);
  }

  // Otherwise stream from Firebase Storage
  if (!product.imageMimeType) {
    return res.status(404).json({ error: "No image found for this product" });
  }

  try {
    const file = bucket.file(`products/${req.params.id}/image`);
    const [exists] = await file.exists();
    if (!exists) return res.status(404).json({ error: "No image found for this product" });

    const [buffer] = await file.download();
    res.set("Content-Type", product.imageMimeType || "image/jpeg");
    res.set("Cache-Control", "public, max-age=86400");
    return res.send(buffer);
  } catch (err) {
    console.error("[getProductImage]", err);
    return res.status(404).json({ error: "No image found for this product" });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────

async function saveImageToStorage(productId, buffer, mimeType) {
  const file = bucket.file(`products/${productId}/image`);
  await file.save(buffer, { metadata: { contentType: mimeType } });
}

/**
 * Resolves image data from an uploaded file or imageUrl string.
 * Returns { imageUrl, imageMimeType } — either may be null/undefined.
 */
async function resolveImageData(file, imageUrl, productId) {
  if (file) {
    await saveImageToStorage(productId, file.buffer, file.mimetype);
    return { imageUrl: null, imageMimeType: file.mimetype };
  }

  if (imageUrl) {
    if (imageUrl.startsWith("data:image/")) {
      const matches = imageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
      if (matches) {
        const mimeType = `image/${matches[1]}`;
        const buffer = Buffer.from(matches[2], "base64");
        await saveImageToStorage(productId, buffer, mimeType);
        return { imageUrl: null, imageMimeType: mimeType };
      }
    } else {
      // Regular URL
      return { imageUrl, imageMimeType: null };
    }
  }

  // imageUrl explicitly set to empty string → clear image
  if (imageUrl === "") {
    try { await bucket.file(`products/${productId}/image`).delete(); } catch { /* ignore */ }
    return { imageUrl: null, imageMimeType: null };
  }

  return {}; // nothing to change
}

module.exports = {
  getProductsByMachine,
  createProduct,
  updateProduct,
  deleteProduct,
  decrementStock,
  uploadProductImage,
  getProductImage,
};
