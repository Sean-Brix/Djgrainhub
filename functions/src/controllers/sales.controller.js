const { db, admin, docToObj, now } = require("../lib/db");

function machineFilter(user) {
  if (user.accessRole === "super_admin") return null;
  return user.ownedMachineId || null;
}

function byTimestampDesc(a, b) {
  return new Date(b.timestamp || b.createdAt || 0) - new Date(a.timestamp || a.createdAt || 0);
}

function buildCsvRow(sale, machineName, items) {
  const products = items
    .map((i) => `${i.productName || i.productId} x${i.quantity}`)
    .join(" | ");
  return `"${sale.id}","${machineName}","${products}","${sale.paymentMethod}","${sale.totalPrice}","${sale.status}","${sale.timestamp}"`;
}

// ─── GET /api/sales ───────────────────────────────────────────────────
async function getSales(req, res) {
  const { status, machineId, limit = 50, page = 1 } = req.query;
  const take = Math.min(parseInt(limit), 200);
  const skip = (parseInt(page) - 1) * take;
  const ownedId = machineFilter(req.user);

  let query = db.collection("sales");
  if (ownedId) query = query.where("machineId", "==", ownedId);
  if (status) query = query.where("status", "==", status);
  if (machineId && (!ownedId || machineId === ownedId)) {
    query = db.collection("sales").where("machineId", "==", machineId);
    if (status) query = query.where("status", "==", status);
  }

  const allSnap = await query.get();
  const saleRows = allSnap.docs.map(docToObj).sort(byTimestampDesc);
  const total = saleRows.length;
  const pageRows = saleRows.slice(skip, skip + take);

  const sales = await Promise.all(
    pageRows.map(async (sale) => {
      const itemsSnap = await db.collection("saleItems").where("saleId", "==", sale.id).get();
      sale.items = await Promise.all(
        itemsSnap.docs.map(async (itemDoc) => {
          const item = docToObj(itemDoc);
          if (item.productId) {
            const prodDoc = await db.collection("products").doc(item.productId).get();
            item.product = prodDoc.exists ? { id: prodDoc.id, name: prodDoc.data().name, weight: prodDoc.data().weight } : null;
          }
          return item;
        })
      );
      if (sale.machineId) {
        const mDoc = await db.collection("machines").doc(sale.machineId).get();
        sale.machine = mDoc.exists ? { id: mDoc.id, name: mDoc.data().name } : null;
      }
      return sale;
    })
  );

  return res.json({ sales, total, page: parseInt(page), limit: take });
}

// ─── GET /api/sales/:id ───────────────────────────────────────────────
async function getSaleById(req, res) {
  const doc = await db.collection("sales").doc(req.params.id).get();
  if (!doc.exists) return res.status(404).json({ error: "Sale not found" });

  const sale = docToObj(doc);
  const itemsSnap = await db.collection("saleItems").where("saleId", "==", sale.id).get();
  sale.items = await Promise.all(
    itemsSnap.docs.map(async (itemDoc) => {
      const item = docToObj(itemDoc);
      if (item.productId) {
        const prodDoc = await db.collection("products").doc(item.productId).get();
        item.product = prodDoc.exists ? docToObj(prodDoc) : null;
      }
      return item;
    })
  );
  if (sale.machineId) {
    const mDoc = await db.collection("machines").doc(sale.machineId).get();
    sale.machine = mDoc.exists ? { id: mDoc.id, name: mDoc.data().name } : null;
  }

  return res.json(sale);
}

// ─── POST /api/sales ──────────────────────────────────────────────────
async function createSale(req, res) {
  const { machineId, paymentMethod = "QR PH", items, status = "completed", paymentIntentId = null } = req.body;

  if (!machineId || !items || items.length === 0) {
    return res.status(400).json({ error: "machineId and items are required" });
  }
  if (status !== "completed") {
    return res.status(400).json({ error: "Only completed sales can be recorded" });
  }

  // Validate products
  const productDocs = await Promise.all(items.map((i) => db.collection("products").doc(i.productId).get()));
  if (productDocs.some((d) => !d.exists)) {
    return res.status(400).json({ error: "One or more products not found" });
  }

  const totalPrice = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const ts = now();

  const batch = db.batch();

  // Sale doc
  const saleRef = db.collection("sales").doc();
  batch.set(saleRef, {
    machineId,
    paymentMethod,
    totalPrice,
    status,
    paymentIntentId,
    timestamp: ts,
    createdAt: ts,
    updatedAt: ts,
  });

  // Sale items
  const itemRefs = items.map((item) => {
    const ref = db.collection("saleItems").doc();
    batch.set(ref, {
      saleId: saleRef.id,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.unitPrice * item.quantity,
      createdAt: ts,
    });
    return ref;
  });

  // Decrement stock for each product
  for (let idx = 0; idx < items.length; idx++) {
    const item = items[idx];
    const productData = docToObj(productDocs[idx]);
    const newStock = Math.max(0, productData.stock - item.quantity);
    batch.update(db.collection("products").doc(item.productId), { stock: newStock, updatedAt: ts });
  }

  // Update machine earnings
  batch.update(db.collection("machines").doc(machineId), {
    earnings: admin.firestore.FieldValue.increment(totalPrice),
    updatedAt: ts,
  });

  await batch.commit();

  const sale = docToObj(await saleRef.get());
  const itemDocs = await Promise.all(itemRefs.map((r) => r.get()));
  sale.items = itemDocs.map(docToObj);

  return res.status(201).json(sale);
}

// ─── PATCH /api/sales/:id/complete ───────────────────────────────────
async function completeSale(req, res) {
  const { id } = req.params;
  const doc = await db.collection("sales").doc(id).get();
  if (!doc.exists) return res.status(404).json({ error: "Sale not found" });

  const sale = docToObj(doc);
  if (sale.status === "completed") return res.json(sale); // idempotent

  await completeSaleById(id);
  return res.json(docToObj(await db.collection("sales").doc(id).get()));
}

// ─── Internal helper (used by payment webhook) ────────────────────────
async function completeSaleById(saleId) {
  const doc = await db.collection("sales").doc(saleId).get();
  if (!doc.exists || doc.data().status === "completed") return docToObj(doc);

  const sale = docToObj(doc);
  const itemsSnap = await db.collection("saleItems").where("saleId", "==", saleId).get();
  const ts = now();

  const batch = db.batch();
  batch.update(db.collection("sales").doc(saleId), { status: "completed", updatedAt: ts });

  for (const itemDoc of itemsSnap.docs) {
    const item = docToObj(itemDoc);
    const prodDoc = await db.collection("products").doc(item.productId).get();
    if (prodDoc.exists) {
      const newStock = Math.max(0, prodDoc.data().stock - item.quantity);
      batch.update(db.collection("products").doc(item.productId), { stock: newStock, updatedAt: ts });
    }
  }

  batch.update(db.collection("machines").doc(sale.machineId), {
    earnings: admin.firestore.FieldValue.increment(sale.totalPrice),
    updatedAt: ts,
  });

  await batch.commit();
  return docToObj(await db.collection("sales").doc(saleId).get());
}

// ─── GET /api/sales/export ────────────────────────────────────────────
async function exportSalesCsv(req, res) {
  const ownedId = machineFilter(req.user);
  let query = db.collection("sales");
  if (ownedId) query = query.where("machineId", "==", ownedId);

  const snap = await query.get();
  const sales = snap.docs.map(docToObj).sort(byTimestampDesc);

  const rows = await Promise.all(
    sales.map(async (sale) => {
      let machineName = sale.machineId;
      if (sale.machineId) {
        const mDoc = await db.collection("machines").doc(sale.machineId).get();
        if (mDoc.exists) machineName = mDoc.data().name;
      }
      const itemsSnap = await db.collection("saleItems").where("saleId", "==", sale.id).get();
      const items = await Promise.all(
        itemsSnap.docs.map(async (iDoc) => {
          const item = docToObj(iDoc);
          const pDoc = await db.collection("products").doc(item.productId).get();
          item.productName = pDoc.exists ? pDoc.data().name : null;
          return item;
        })
      );
      return buildCsvRow(sale, machineName, items);
    })
  );

  const header = "Transaction ID,Machine,Products,Payment Method,Total Price,Status,Timestamp";
  const csv = [header, ...rows].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="dj_grain_hub_transactions.csv"');
  return res.send(csv);
}

module.exports = { getSales, getSaleById, createSale, completeSale, completeSaleById, exportSalesCsv };
