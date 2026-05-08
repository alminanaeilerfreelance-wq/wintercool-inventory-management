const express = require('express');
const router = express.Router();
const Invoice = require('../models/Invoice');
const Inventory = require('../models/Inventory');
const User = require('../models/User');
const { protect, adminOnly } = require('../middleware/auth');
const { generateInvoiceNo } = require('../utils/invoiceNumber');
const { generateQRCode } = require('../utils/qrCode');
const { updateStockStatus } = require('../utils/stockStatus');

const populateOptions = [
  { path: 'customer' },
  { path: 'supplier' },
  { path: 'subDealer' },
  { path: 'employee', select: 'name position' },
  { path: 'installer', select: 'name position contact' },
  { path: 'storeBranch', select: 'name contact' },
  { path: 'warehouse' },
  { path: 'items.inventory' },
  { path: 'items.service' },
  { path: 'createdBy', select: 'username customerName email' },
  { path: 'approvedBy', select: 'username customerName email' },
];

// Calculate VAT and total from subtotal + discount + vatType + vatRate
const calculateTotals = (subtotal, discount = 0, discountType = 'fixed', vatType = 'none', vatRate = 0) => {
  let afterDiscount = subtotal;

  if (discountType === 'percent') {
    afterDiscount = subtotal - (subtotal * discount) / 100;
  } else {
    afterDiscount = subtotal - discount;
  }

  if (afterDiscount < 0) afterDiscount = 0;

  let vatAmount = 0;
  let total = afterDiscount;

  if (vatType === 'exclusive') {
    vatAmount = (afterDiscount * vatRate) / 100;
    total = afterDiscount + vatAmount;
  } else if (vatType === 'inclusive') {
    // VAT is already inside the afterDiscount amount
    vatAmount = afterDiscount - afterDiscount / (1 + vatRate / 100);
    total = afterDiscount;
  }

  return {
    subtotal,
    vatAmount: parseFloat(vatAmount.toFixed(4)),
    total: parseFloat(total.toFixed(4)),
  };
};

const normalizePaymentStatus = (status) => {
  if (!status) return 'pending';
  return String(status).toLowerCase();
};

const decrementTypes = ['customer', 'service', 'sub-dealer'];

const adjustInventoryQuantity = async (inventoryId, quantityDelta) => {
  if (!inventoryId) return;

  const inventory = await Inventory.findById(inventoryId);
  if (!inventory) return;

  const currentQuantity = Number(inventory.quantity || 0);
  inventory.quantity = Math.max(0, currentQuantity - Number(quantityDelta));
  inventory.stockStatus = updateStockStatus(inventory.quantity, inventory.lowStockThreshold);
  await inventory.save();
};

// GET /api/invoices — list with filters + pagination (+ noPagination support)
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10, invoiceType, paymentStatus, search = '', noPagination } = req.query;
    const query = {};

    if (invoiceType) query.invoiceType = invoiceType;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    // Branch filtering for non-admin users
    const isAdmin = req.user.role === 'admin';
    if (!isAdmin) {
      const userDoc = await User.findById(req.user._id).populate('assignedBranch');
      if (userDoc?.assignedBranch) {
        query.storeBranch = userDoc.assignedBranch._id;
      }
    }

    // Enhanced search across multiple fields
    if (search) {
      const searchRegex = { $regex: search, $options: 'i' };
      query.$or = [
        { invoiceNo: searchRegex },
        { 'customer.name': searchRegex },
        { 'customer.email': searchRegex },
        { 'employee.name': searchRegex },
        { 'installer.name': searchRegex },
        { 'storeBranch.name': searchRegex },
        { 'subDealer.name': searchRegex },
        { 'supplier.name': searchRegex },
      ];
    }

    const total = await Invoice.countDocuments(query);
    
    // If noPagination=true, return all items without pagination
    if (noPagination) {
      const items = await Invoice.find(query)
        .populate(populateOptions)
        .sort({ createdAt: -1 });
      return res.json({ items, total: items.length });
    }

    const items = await Invoice.find(query)
      .populate(populateOptions)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    res.json({ items, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/invoices/:id/qr — generate QR code for invoice
router.get('/:id/qr', protect, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Not found' });

    const qrData = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invoices/${invoice._id}`;
    const qrCode = await generateQRCode(qrData);

    res.json({ qrCode });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/invoices/:id — single with full population + QR
router.get('/:id', protect, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate(populateOptions);
    if (!invoice) return res.status(404).json({ message: 'Not found' });

    let qrCode = invoice.qrCode;
    if (!qrCode) {
      const qrData = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invoices/${invoice._id}`;
      qrCode = await generateQRCode(qrData);
      await Invoice.findByIdAndUpdate(invoice._id, { qrCode });
    }

    res.json({ ...invoice.toObject(), qrCode });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/invoices — create invoice
router.post('/', protect, async (req, res) => {
  try {
    const {
      invoiceType,
      customerId,
      customer,
      subDealerId,
      subDealer,
      supplierId,
      supplier,
      employeeId,
      employee,
      installerId,
      storeBranchId,
      storeBranch,
      warehouseId,
      warehouse,
      items = [],
      discount = 0,
      discountType = 'fixed',
      vatType = 'none',
      vatRate = 0,
      paymentStatus = 'pending',
      notes,
    } = req.body;

    const invoiceNo = generateInvoiceNo();

    // Calculate subtotal from items
    const subtotal = items.reduce((sum, item) => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.price) || 0;
      const itemSubtotal = qty * price;
      item.subtotal = itemSubtotal;
      return sum + itemSubtotal;
    }, 0);

    const { vatAmount, total } = calculateTotals(subtotal, discount, discountType, vatType, vatRate);

    const qrData = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invoices/preview/${invoiceNo}`;
    const qrCode = await generateQRCode(qrData);

    // Determine employee and installer
    const resolvedEmployee = employeeId || employee;
    const resolvedInstaller = installerId;

    const invoice = await Invoice.create({
      invoiceNo,
      invoiceDate: req.body.invoiceDate ? new Date(req.body.invoiceDate) : undefined,
      invoiceType,
      customer: customerId || customer,
      subDealer: subDealerId || subDealer,
      supplier: supplierId || supplier,
      employee: resolvedEmployee,
      installer: resolvedInstaller,
      storeBranch: storeBranchId || storeBranch,
      warehouse: warehouseId || warehouse,
      items,
      subtotal,
      discount,
      discountType,
      vatAmount,
      vatType,
      total,
      notes,
      paymentStatus: normalizePaymentStatus(paymentStatus) || 'pending',
      qrCode,
      createdBy: req.user._id,
    });

    // Auto-create calendar event if calendarDate is provided
    if (req.body.calendarDate && req.body.calendarTitle) {
      try {
        const CalendarEvent = require('../models/CalendarEvent');
        const calEvent = await CalendarEvent.create({
          title: req.body.calendarTitle || `Invoice ${invoice.invoiceNo}`,
          startDate: new Date(req.body.calendarDate),
          endDate: new Date(req.body.calendarDate),
          type: 'invoice',
          description: `Auto-created for invoice ${invoice.invoiceNo}`,
          color: '#1565c0',
          invoiceRef: invoice.invoiceNo,
        });
        invoice.calendarEventId = calEvent._id;
        await invoice.save();
      } catch (calErr) {
        console.error('[Calendar] Failed to create event:', calErr.message);
        // Non-fatal — don't fail the invoice creation
      }
    }

    if (decrementTypes.includes(invoiceType)) {
      await Promise.all(
        items.map(async (item) => {
          const inventoryId = item.inventory?._id || item.inventory;
          const qty = Number(item.quantity) || 0;
          if (!inventoryId || qty <= 0) return;
          await adjustInventoryQuantity(inventoryId, qty);
        })
      );
    }

    const populated = await Invoice.findById(invoice._id).populate(populateOptions);
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/invoices/:id — update invoice fields
router.put('/:id', protect, async (req, res) => {
  try {
    const existing = await Invoice.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Not found' });

    const {
      items,
      discount,
      discountType,
      vatType,
      vatRate,
      invoiceType,
      customerId,
      customer,
      subDealerId,
      subDealer,
      supplierId,
      supplier,
      employeeId,
      employee,
      installerId,
      storeBranchId,
      storeBranch,
      warehouseId,
      warehouse,
      paymentStatus,
      ...rest
    } = req.body;

    const updateData = { ...rest };

// Field mapping - support both Id and non-Id field names
    if (customerId || customer) updateData.customer = customerId || customer;
    if (subDealerId || subDealer) updateData.subDealer = subDealerId || subDealer;
    if (supplierId || supplier) updateData.supplier = supplierId || supplier;
    if (employeeId || employee) updateData.employee = employeeId || employee;
    // Map installerId to installer field (separate from employee)
    if (installerId) updateData.installer = installerId;
    if (storeBranchId || storeBranch) updateData.storeBranch = storeBranchId || storeBranch;
    if (warehouseId || warehouse) updateData.warehouse = warehouseId || warehouse;
    if (invoiceType) updateData.invoiceType = invoiceType;

    const newInvoiceType = invoiceType || existing.invoiceType;
    const oldInvoiceType = existing.invoiceType;

    if (items) {
      if (decrementTypes.includes(oldInvoiceType)) {
        await Promise.all(
          existing.items.map(async (item) => {
            const inventoryId = item.inventory?._id || item.inventory;
            const qty = Number(item.quantity) || 0;
            if (!inventoryId || qty <= 0) return;
            await adjustInventoryQuantity(inventoryId, -qty);
          })
        );
      }

      if (decrementTypes.includes(newInvoiceType)) {
        await Promise.all(
          items.map(async (item) => {
            const inventoryId = item.inventory?._id || item.inventory;
            const qty = Number(item.quantity) || 0;
            if (!inventoryId || qty <= 0) return;
            await adjustInventoryQuantity(inventoryId, qty);
          })
        );
      }

      const itemsWithSubtotals = items.map((item) => ({
        ...item,
        subtotal: (Number(item.quantity) || 0) * (Number(item.price) || 0),
      }));

      const subtotal = itemsWithSubtotals.reduce((sum, i) => sum + i.subtotal, 0);
      const { vatAmount, total } = calculateTotals(
        subtotal,
        discount !== undefined ? discount : existing.discount,
        discountType || existing.discountType,
        vatType || existing.vatType,
        vatRate !== undefined ? vatRate : 0
      );

      updateData.items = itemsWithSubtotals;
      updateData.subtotal = subtotal;
      updateData.vatAmount = vatAmount;
      updateData.total = total;
    } else if (invoiceType && invoiceType !== oldInvoiceType) {
      if (decrementTypes.includes(oldInvoiceType) && !decrementTypes.includes(newInvoiceType)) {
        await Promise.all(
          existing.items.map(async (item) => {
            const inventoryId = item.inventory?._id || item.inventory;
            const qty = Number(item.quantity) || 0;
            if (!inventoryId || qty <= 0) return;
            await adjustInventoryQuantity(inventoryId, -qty);
          })
        );
      } else if (!decrementTypes.includes(oldInvoiceType) && decrementTypes.includes(newInvoiceType)) {
        await Promise.all(
          existing.items.map(async (item) => {
            const inventoryId = item.inventory?._id || item.inventory;
            const qty = Number(item.quantity) || 0;
            if (!inventoryId || qty <= 0) return;
            await adjustInventoryQuantity(inventoryId, qty);
          })
        );
      }
    }

    if (paymentStatus !== undefined) updateData.paymentStatus = normalizePaymentStatus(paymentStatus);
    if (discount !== undefined) updateData.discount = discount;
    if (discountType) updateData.discountType = discountType;
    if (vatType) updateData.vatType = vatType;

    const invoice = await Invoice.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate(populateOptions);

    res.json(invoice);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/invoices/:id/status — update payment status
router.put('/:id/status', protect, async (req, res) => {
  try {
    const { paymentStatus } = req.body;
    if (!paymentStatus) return res.status(400).json({ message: 'paymentStatus is required' });

    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { paymentStatus },
      { new: true, runValidators: true }
    ).populate(populateOptions);

    if (!invoice) return res.status(404).json({ message: 'Not found' });
    res.json(invoice);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/invoices/:id — admin only
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const item = await Invoice.findById(req.params.id);
    if (!item) return res.status(404).json({ message: 'Not found' });

    if (decrementTypes.includes(item.invoiceType)) {
      await Promise.all(
        item.items.map(async (invoiceItem) => {
          const inventoryId = invoiceItem.inventory?._id || invoiceItem.inventory;
          const qty = Number(invoiceItem.quantity) || 0;
          if (!inventoryId || qty <= 0) return;
          await adjustInventoryQuantity(inventoryId, -qty);
        })
      );
    }

    await Invoice.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
