const { prisma } = require("../lib/prisma");

// ─── GET /api/machines/:machineId/products ────────────────────────────
// Returns all products for a machine, ordered by slot number.
// Excludes imageBlob to keep response size small; frontend will fetch
// images separately from /api/products/:id/image when imageMimeType is present.
async function getProductsByMachine(req, res) {
  const { machineId } = req.params;

  const products = await prisma.product.findMany({
    where: { machineId },
    orderBy: { slotNumber: "asc" },
    select: {
      id: true,
      machineId: true,
      slotNumber: true,
      name: true,
      price: true,
      cost: true,
      weight: true,
      stock: true,
      imageUrl: true,
      imageMimeType: true, // Include this so frontend knows if blob exists
      // imageBlob excluded - too large for list responses
      createdAt: true,
      updatedAt: true,
    },
  });

  return res.json(products);
}

// ─── POST /api/machines/:machineId/products ───────────────────────────
// Adds a product to a specific slot on a machine.
// Supports both imageUrl (string) and image file upload (multipart).
async function createProduct(req, res) {
  const { machineId } = req.params;
  const { slotNumber, name, price, cost, weight, stock, imageUrl } = req.body;

  if (!slotNumber || !name || price == null || cost == null || weight == null) {
    return res.status(400).json({
      error: "slotNumber, name, price, cost, and weight are required",
    });
  }

  // Enforce one product per slot
  const existing = await prisma.product.findUnique({
    where: { machineId_slotNumber: { machineId, slotNumber: parseInt(slotNumber) } },
  });
  if (existing) {
    return res.status(409).json({ error: `Slot ${slotNumber} is already occupied` });
  }

  // Prepare image data from either uploaded file, base64 data URL, or regular URL
  const imageData = {};
  if (req.file) {
    // Image uploaded via multipart
    imageData.imageBlob = req.file.buffer;
    imageData.imageMimeType = req.file.mimetype;
    imageData.imageUrl = null; // Clear URL if file is provided
  } else if (imageUrl) {
    // Check if it's a base64 data URL (e.g., "data:image/jpeg;base64,...")
    if (imageUrl.startsWith('data:image/')) {
      // Extract base64 data and convert to buffer
      const matches = imageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
      if (matches) {
        const mimeType = `image/${matches[1]}`;
        const base64Data = matches[2];
        imageData.imageBlob = Buffer.from(base64Data, 'base64');
        imageData.imageMimeType = mimeType;
        imageData.imageUrl = null;
      } else {
        console.warn('Invalid data URL format for image');
      }
    } else {
      // Regular URL provided
      imageData.imageUrl = imageUrl;
    }
  }

  const product = await prisma.product.create({
    data: {
      machineId,
      slotNumber: parseInt(slotNumber),
      name,
      price: parseFloat(price),
      cost: parseFloat(cost),
      weight: parseFloat(weight),
      stock: stock ? parseInt(stock) : 0,
      ...imageData,
    },
    select: {
      id: true,
      machineId: true,
      slotNumber: true,
      name: true,
      price: true,
      cost: true,
      weight: true,
      stock: true,
      imageUrl: true,
      imageMimeType: true,
      // imageBlob excluded from response
      createdAt: true,
      updatedAt: true,
    },
  });

  return res.status(201).json(product);
}

// ─── PATCH /api/products/:id ──────────────────────────────────────────
// Updates product details (name, price, cost, weight, image).
// Supports both imageUrl (string) and image file upload (multipart).
async function updateProduct(req, res) {
  const { id } = req.params;
  const { name, price, cost, weight, stock, imageUrl, slotNumber } = req.body;

  const updateData = {
    ...(name !== undefined && { name }),
    ...(price !== undefined && { price: parseFloat(price) }),
    ...(cost !== undefined && { cost: parseFloat(cost) }),
    ...(weight !== undefined && { weight: parseFloat(weight) }),
    ...(stock !== undefined && { stock: parseInt(stock) }),
    ...(slotNumber !== undefined && { slotNumber: parseInt(slotNumber) }),
  };

  // Handle image upload or URL
  if (req.file) {
    // Image uploaded via multipart - store as blob
    updateData.imageBlob = req.file.buffer;
    updateData.imageMimeType = req.file.mimetype;
    updateData.imageUrl = null; // Clear URL when file is uploaded
  } else if (imageUrl !== undefined) {
    // Check if it's a base64 data URL (e.g., "data:image/jpeg;base64,...")
    if (imageUrl && imageUrl.startsWith('data:image/')) {
      // Extract base64 data and convert to buffer
      const matches = imageUrl.match(/^data:image\/(\w+);base64,(.+)$/);
      if (matches) {
        const mimeType = `image/${matches[1]}`;
        const base64Data = matches[2];
        updateData.imageBlob = Buffer.from(base64Data, 'base64');
        updateData.imageMimeType = mimeType;
        updateData.imageUrl = null;
      } else {
        // Invalid data URL format, ignore
        console.warn('Invalid data URL format for image');
      }
    } else if (imageUrl) {
      // Regular URL - store as URL
      updateData.imageUrl = imageUrl;
      updateData.imageBlob = null;
      updateData.imageMimeType = null;
    } else {
      // Explicitly clearing image
      updateData.imageUrl = null;
      updateData.imageBlob = null;
      updateData.imageMimeType = null;
    }
  }

  const product = await prisma.product.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      machineId: true,
      slotNumber: true,
      name: true,
      price: true,
      cost: true,
      weight: true,
      stock: true,
      imageUrl: true,
      imageMimeType: true,
      // imageBlob excluded from response
      createdAt: true,
      updatedAt: true,
    },
  });

  return res.json(product);
}

// ─── DELETE /api/products/:id ─────────────────────────────────────────
// Removes a product from its slot.
async function deleteProduct(req, res) {
  await prisma.product.delete({ where: { id: req.params.id } });
  return res.json({ message: "Product deleted" });
}

// ─── PATCH /api/products/:id/stock ───────────────────────────────────
// Decrements product stock by a given quantity (called after dispensing).
// Prevents stock from going below 0.
async function decrementStock(req, res) {
  const { id } = req.params;
  const { quantity } = req.body;

  if (!quantity || quantity <= 0) {
    return res.status(400).json({ error: "quantity must be a positive number" });
  }

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return res.status(404).json({ error: "Product not found" });

  const newStock = Math.max(0, product.stock - quantity);

  const updated = await prisma.product.update({
    where: { id },
    data: { stock: newStock },
  });

  // Trigger low-stock alert if stock drops below 3 units
  if (newStock <= 3 && product.stock > 3) {
    await prisma.alert.create({
      data: {
        machineId: product.machineId,
        type: "stock",
        severity: newStock === 0 ? "critical" : "high",
        message: `${product.name} (Slot ${product.slotNumber}) is ${newStock === 0 ? "out of stock" : "critically low"} — ${newStock} unit(s) remaining`,
        status: "active",
      },
    });

    // Keep alertCount in sync on the machine
    await prisma.machine.update({
      where: { id: product.machineId },
      data: { alertCount: { increment: 1 } },
    });
  }

  return res.json(updated);
}

// ─── POST /api/products/:id/image ────────────────────────────────────
// Accepts a multipart upload (field name: "image") and stores the binary
// data directly in the database as a LONGBLOB.
async function uploadProductImage(req, res) {
  const { id } = req.params;

  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded (field name must be 'image')" });
  }

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) return res.status(404).json({ error: "Product not found" });

  await prisma.product.update({
    where: { id },
    data: {
      imageBlob: req.file.buffer,
      imageMimeType: req.file.mimetype,
    },
  });

  return res.json({ id, imageMimeType: req.file.mimetype, size: req.file.size });
}

// ─── GET /api/products/:id/image ─────────────────────────────────────
// Streams the stored image blob back to the client with the correct
// Content-Type. Returns 404 if no blob has been uploaded yet.
async function getProductImage(req, res) {
  const product = await prisma.product.findUnique({
    where: { id: req.params.id },
    select: { imageBlob: true, imageMimeType: true },
  });

  if (!product || !product.imageBlob) {
    return res.status(404).json({ error: "No image found for this product" });
  }

  res.set("Content-Type", product.imageMimeType || "image/jpeg");
  res.set("Cache-Control", "public, max-age=86400");
  return res.send(product.imageBlob);
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
