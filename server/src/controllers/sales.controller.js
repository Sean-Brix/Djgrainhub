const { prisma } = require("../lib/prisma");

// ─── Helpers ──────────────────────────────────────────────────────────

function machineFilter(user) {
  if (user.accessRole === "super_admin") return {};
  return user.ownedMachineId
    ? { machineId: user.ownedMachineId }
    : { machineId: "NONE" };
}

function buildCsvRow(sale, machine, items) {
  const products = items
    .map((i) => `${i.product?.name || i.productId} x${i.quantity}`)
    .join(" | ");
  return `"${sale.id}","${machine?.name || sale.machineId}","${products}","${sale.paymentMethod}","${sale.totalPrice}","${sale.status}","${sale.timestamp}"`;
}

// ─── GET /api/sales ───────────────────────────────────────────────────
// Returns paginated sales visible to the user.
// Supports ?status=completed|failed, ?machineId=, ?limit=, ?page=
async function getSales(req, res) {
  const { status, machineId, limit = 50, page = 1 } = req.query;
  const take = Math.min(parseInt(limit), 200);
  const skip = (parseInt(page) - 1) * take;

  const where = {
    ...machineFilter(req.user),
    ...(status && { status }),
    ...(machineId && { machineId }),
  };

  const [sales, total] = await prisma.$transaction([
    prisma.sale.findMany({
      where,
      include: {
        items: {
          include: { product: { select: { id: true, name: true, weight: true } } },
        },
        machine: { select: { id: true, name: true } },
      },
      orderBy: { timestamp: "desc" },
      take,
      skip,
    }),
    prisma.sale.count({ where }),
  ]);

  return res.json({ sales, total, page: parseInt(page), limit: take });
}

// ─── GET /api/sales/:id ───────────────────────────────────────────────
// Returns a single sale with full item detail.
async function getSaleById(req, res) {
  const sale = await prisma.sale.findUnique({
    where: { id: req.params.id },
    include: {
      items: {
        include: { product: true },
      },
      machine: { select: { id: true, name: true } },
    },
  });

  if (!sale) return res.status(404).json({ error: "Sale not found" });
  return res.json(sale);
}

// ─── POST /api/sales ──────────────────────────────────────────────────
// Creates a new sale from the kiosk checkout flow.
// Body: { machineId, paymentMethod, items: [{ productId, quantity, unitPrice }],
//         status?: "pending"|"completed", paymentIntentId?: string }
//
// When status is "pending" (default for kiosk) stock is NOT yet decremented —
// that happens in completeSale() once the webhook confirms payment.
async function createSale(req, res) {
  const {
    machineId,
    paymentMethod = "QR PH",
    items,
    status = "pending",
    paymentIntentId = null,
  } = req.body;

  if (!machineId || !items || items.length === 0) {
    return res.status(400).json({ error: "machineId and items are required" });
  }

  // Validate all products exist
  const productIds = items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });

  if (products.length !== productIds.length) {
    return res.status(400).json({ error: "One or more products not found" });
  }

  const totalPrice = items.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );

  // Create the sale record (pending or completed)
  const sale = await prisma.$transaction(async (tx) => {
    const newSale = await tx.sale.create({
      data: {
        machineId,
        paymentMethod,
        totalPrice,
        status,
        paymentIntentId,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.unitPrice * item.quantity,
          })),
        },
      },
      include: { items: true },
    });

    // Only decrement stock & update earnings immediately if already completed
    if (status === "completed") {
      for (const item of items) {
        const product = products.find((p) => p.id === item.productId);
        const newStock = Math.max(0, product.stock - item.quantity);
        await tx.product.update({ where: { id: item.productId }, data: { stock: newStock } });
      }
      await tx.machine.update({
        where: { id: machineId },
        data: { earnings: { increment: totalPrice } },
      });
    }

    return newSale;
  });

  return res.status(201).json(sale);
}

// ─── PATCH /api/sales/:id/complete ───────────────────────────────────
// Marks a pending sale as completed, decrements product stock,
// and updates machine earnings.
// Called by the kiosk as a fallback if the webhook already fired,
// this is a no-op (sale already completed).
async function completeSale(req, res) {
  const { id } = req.params;

  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      items: { include: { product: true } },
    },
  });

  if (!sale) return res.status(404).json({ error: "Sale not found" });
  if (sale.status === "completed") return res.json(sale); // already done — idempotent

  const updated = await prisma.$transaction(async (tx) => {
    const completedSale = await tx.sale.update({
      where: { id },
      data: { status: "completed" },
      include: { items: true },
    });

    for (const item of sale.items) {
      const newStock = Math.max(0, item.product.stock - item.quantity);
      await tx.product.update({ where: { id: item.productId }, data: { stock: newStock } });
    }

    await tx.machine.update({
      where: { id: sale.machineId },
      data: { earnings: { increment: sale.totalPrice } },
    });

    return completedSale;
  });

  return res.json(updated);
}

// ─── Internal helper (used by webhook) ───────────────────────────────
// Same logic as completeSale but takes a sale object instead of req/res.
async function completeSaleById(saleId) {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { items: { include: { product: true } } },
  });

  if (!sale || sale.status === "completed") return sale; // not found or already done

  return prisma.$transaction(async (tx) => {
    const completedSale = await tx.sale.update({
      where: { id: saleId },
      data: { status: "completed" },
    });

    for (const item of sale.items) {
      const newStock = Math.max(0, item.product.stock - item.quantity);
      await tx.product.update({ where: { id: item.productId }, data: { stock: newStock } });
    }

    await tx.machine.update({
      where: { id: sale.machineId },
      data: { earnings: { increment: sale.totalPrice } },
    });

    return completedSale;
  });
}

// ─── GET /api/sales/export ────────────────────────────────────────────
// Returns a CSV file of all transactions for the current user.
async function exportSalesCsv(req, res) {
  const where = machineFilter(req.user);

  const sales = await prisma.sale.findMany({
    where,
    include: {
      items: { include: { product: { select: { name: true } } } },
      machine: { select: { name: true } },
    },
    orderBy: { timestamp: "desc" },
  });

  const header =
    "Transaction ID,Machine,Products,Payment Method,Total Price,Status,Timestamp";
  const rows = sales.map((s) => buildCsvRow(s, s.machine, s.items));
  const csv = [header, ...rows].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="dj_grain_hub_transactions.csv"'
  );
  return res.send(csv);
}

module.exports = { getSales, getSaleById, createSale, completeSale, completeSaleById, exportSalesCsv };
