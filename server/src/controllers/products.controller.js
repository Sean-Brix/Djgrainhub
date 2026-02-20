const { prisma } = require("../lib/prisma");

// ─── GET /api/machines/:machineId/products ────────────────────────────
// Returns all products for a machine, ordered by slot number.
async function getProductsByMachine(req, res) {
  const { machineId } = req.params;

  const products = await prisma.product.findMany({
    where: { machineId },
    orderBy: { slotNumber: "asc" },
  });

  return res.json(products);
}

// ─── POST /api/machines/:machineId/products ───────────────────────────
// Adds a product to a specific slot on a machine.
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

  const product = await prisma.product.create({
    data: {
      machineId,
      slotNumber: parseInt(slotNumber),
      name,
      price: parseFloat(price),
      cost: parseFloat(cost),
      weight: parseFloat(weight),
      stock: stock ? parseInt(stock) : 0,
      imageUrl: imageUrl || null,
    },
  });

  return res.status(201).json(product);
}

// ─── PATCH /api/products/:id ──────────────────────────────────────────
// Updates product details (name, price, cost, weight, image).
async function updateProduct(req, res) {
  const { id } = req.params;
  const { name, price, cost, weight, stock, imageUrl, slotNumber } = req.body;

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(price !== undefined && { price: parseFloat(price) }),
      ...(cost !== undefined && { cost: parseFloat(cost) }),
      ...(weight !== undefined && { weight: parseFloat(weight) }),
      ...(stock !== undefined && { stock: parseInt(stock) }),
      ...(imageUrl !== undefined && { imageUrl }),
      ...(slotNumber !== undefined && { slotNumber: parseInt(slotNumber) }),
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

module.exports = {
  getProductsByMachine,
  createProduct,
  updateProduct,
  deleteProduct,
  decrementStock,
};
