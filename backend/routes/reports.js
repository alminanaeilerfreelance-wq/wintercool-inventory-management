const express = require('express');
const router = express.Router();
const XLSX = require('xlsx');
const Invoice = require('../models/Invoice');
const PurchaseOrder = require('../models/PurchaseOrder');
const { protect } = require('../middleware/auth');

// Build date match stage from query params
const buildDateMatch = (dateFrom, dateTo, field = 'createdAt') => {
  const match = {};
  if (dateFrom || dateTo) {
    match[field] = {};
    if (dateFrom) match[field].$gte = new Date(dateFrom);
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      match[field].$lte = end;
    }
  }
  return match;
};

// Build group-by expression based on period param
const buildGroupId = (period = 'day') => {
  if (period === 'month') {
    return { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } };
  }
  if (period === 'year') {
    return { year: { $year: '$createdAt' } };
  }
  // default: day
  return {
    year: { $year: '$createdAt' },
    month: { $month: '$createdAt' },
    day: { $dayOfMonth: '$createdAt' },
  };
};

// GET /api/reports/sales — aggregate or raw customer invoice lines
router.get('/sales', protect, async (req, res) => {
  try {
    const { dateFrom, dateTo, branch, branchId, period = 'day', raw, search, status } = req.query;
    const branchParam = branch || branchId;

    const matchStage = {
      invoiceType: 'customer',
      ...buildDateMatch(dateFrom, dateTo),
    };
    if (branchParam) matchStage.storeBranch = require('mongoose').Types.ObjectId.createFromHexString(branchParam);
    if (status) {
      const statusRegex = new RegExp(`^${status}$`, 'i');
      matchStage.$or = [
        { paymentStatus: statusRegex },
        { status: statusRegex },
      ];
    }

    if (raw === 'true' || raw === true) {
      const invoices = await Invoice.find(matchStage)
        .populate('customer', 'name')
        .populate('items.inventory', 'sku')
        .populate('storeBranch', 'name')
        .sort({ createdAt: -1 })
        .lean();

      let items = invoices.flatMap((invoice) => {
        const customer = invoice.customer || {};
        const branch = invoice.storeBranch || {};
        return (invoice.items || []).map((item) => ({
          invoiceDate: invoice.invoiceDate || invoice.createdAt,
          invoiceNo: invoice.invoiceNo,
          customer,
          branch,
          qty: item.quantity || item.qty || 0,
          price: item.price || 0,
          subtotal: item.subtotal || (item.quantity || 0) * (item.price || 0),
          discount: item.discount || 0,
          total: item.subtotal || item.total || (item.quantity || 0) * (item.price || 0),
          status: invoice.paymentStatus || invoice.status || 'pending',
        }));
      });

      if (search) {
        const searchRegex = new RegExp(search, 'i');
        const numericSearch = Number(search);
        items = items.filter((item) => {
          return [
            String(item.invoiceNo || ''),
            String(item.customer?.name || ''),
            String(item.branch?.name || ''),
            String(item.status || ''),
          ].some((value) => searchRegex.test(value))
            || (!Number.isNaN(numericSearch) && (
              Number(item.subtotal) === numericSearch ||
              Number(item.total) === numericSearch ||
              Number(item.price) === numericSearch
            ));
        });
      }

      const totals = items.reduce(
        (acc, cur) => {
          acc.qty += cur.qty || 0;
          acc.subtotal += cur.subtotal || 0;
          acc.total += cur.total || 0;
          return acc;
        },
        { qty: 0, subtotal: 0, total: 0 }
      );

      return res.json({ items, totals });
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: buildGroupId(period),
          subtotal: { $sum: '$subtotal' },
          total: { $sum: '$total' },
          qty: { $sum: { $size: { $ifNull: ['$items', []] } } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ];

    const items = await Invoice.aggregate(pipeline);

    const totals = items.reduce(
      (acc, cur) => {
        acc.subtotal += cur.subtotal || 0;
        acc.total += cur.total || 0;
        acc.qty += cur.qty || 0;
        return acc;
      },
      { subtotal: 0, total: 0, qty: 0 }
    );

    res.json({ items, totals });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/reports/services — aggregate or raw service invoice lines
router.get('/services', protect, async (req, res) => {
  try {
    const { dateFrom, dateTo, branch, branchId, period = 'day', raw, search, status } = req.query;
    const branchParam = branch || branchId;

    const matchStage = {
      invoiceType: 'service',
      ...buildDateMatch(dateFrom, dateTo),
    };
    if (branchParam) matchStage.storeBranch = require('mongoose').Types.ObjectId.createFromHexString(branchParam);
    if (status) {
      const statusRegex = new RegExp(`^${status}$`, 'i');
      matchStage.$or = [
        { paymentStatus: statusRegex },
        { status: statusRegex },
      ];
    }

    if (raw === 'true' || raw === true) {
      const invoices = await Invoice.find(matchStage)
        .populate('customer', 'name')
        .populate('items.service', 'name')
        .sort({ createdAt: -1 })
        .lean();

      let items = invoices.flatMap((invoice) => {
        const customer = invoice.customer || {};
        return (invoice.items || []).map((item) => ({
          invoiceDate: invoice.invoiceDate || invoice.createdAt,
          invoiceNo: invoice.invoiceNo,
          customer,
          service: item.service || {},
          qty: item.quantity || item.qty || 0,
          price: item.price || 0,
          total: item.subtotal || item.total || (item.quantity || 0) * (item.price || 0),
          status: invoice.paymentStatus || invoice.status || 'pending',
          branch: invoice.storeBranch,
        }));
      });

      if (search) {
        const searchRegex = new RegExp(search, 'i');
        const numericSearch = Number(search);
        items = items.filter((item) => {
          return [
            String(item.invoiceNo || ''),
            String(item.customer?.name || ''),
            String(item.service?.name || ''),
            String(item.branch?.name || ''),
            String(item.status || ''),
          ].some((value) => searchRegex.test(value))
            || (!Number.isNaN(numericSearch) && (
              Number(item.price) === numericSearch ||
              Number(item.total) === numericSearch ||
              Number(item.qty) === numericSearch
            ));
        });
      }

      const totals = items.reduce(
        (acc, cur) => {
          acc.qty += cur.qty || 0;
          acc.price += cur.price || 0;
          acc.total += cur.total || 0;
          return acc;
        },
        { qty: 0, price: 0, total: 0 }
      );

      return res.json({ items, totals });
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: buildGroupId(period),
          subtotal: { $sum: '$subtotal' },
          total: { $sum: '$total' },
          qty: { $sum: { $size: { $ifNull: ['$items', []] } } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ];

    const items = await Invoice.aggregate(pipeline);

    const totals = items.reduce(
      (acc, cur) => {
        acc.subtotal += cur.subtotal || 0;
        acc.total += cur.total || 0;
        acc.qty += cur.qty || 0;
        return acc;
      },
      { subtotal: 0, total: 0, qty: 0 }
    );

    res.json({ items, totals });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/reports/supplier — aggregate or raw purchase orders
router.get('/supplier', protect, async (req, res) => {
  try {
    const { dateFrom, dateTo, supplier, supplierId, period = 'day', raw, search, status } = req.query;
    const supplierParam = supplier || supplierId;

    const matchStage = { ...buildDateMatch(dateFrom, dateTo) };
    if (supplierParam) matchStage.supplier = require('mongoose').Types.ObjectId.createFromHexString(supplierParam);
    if (status) {
      const statusRegex = new RegExp(`^${status}$`, 'i');
      matchStage.status = statusRegex;
    }

    if (raw === 'true' || raw === true) {
      const pos = await PurchaseOrder.find(matchStage)
        .populate('supplier', 'name')
        .populate('warehouse', 'name')
        .sort({ createdAt: -1 })
        .lean();

      let items = pos.map((po) => ({
        createdAt: po.createdAt,
        date: po.createdAt,
        invoiceNo: po.invoiceNo,
        supplier: po.supplier || {},
        warehouse: po.warehouse || {},
        itemsCount: Array.isArray(po.items) ? po.items.length : 0,
        total: po.totalAmount || 0,
        status: po.status || 'pending',
        approved: po.isApproved || false,
      }));

      if (search) {
        const searchRegex = new RegExp(search, 'i');
        const numericSearch = Number(search);
        items = items.filter((item) => {
          return [
            String(item.invoiceNo || ''),
            String(item.supplier?.name || ''),
            String(item.warehouse?.name || ''),
            String(item.status || ''),
          ].some((value) => searchRegex.test(value))
            || (!Number.isNaN(numericSearch) && (
              Number(item.total) === numericSearch ||
              Number(item.itemsCount) === numericSearch
            ));
        });
      }

      const totals = items.reduce(
        (acc, cur) => {
          acc.itemsCount += cur.itemsCount || 0;
          acc.total += cur.total || 0;
          return acc;
        },
        { itemsCount: 0, total: 0 }
      );

      return res.json({ items, totals });
    }

    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: buildGroupId(period),
          subtotal: { $sum: '$subtotal' },
          total: { $sum: '$totalAmount' },
          qty: { $sum: { $size: { $ifNull: ['$items', []] } } },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ];

    const items = await PurchaseOrder.aggregate(pipeline);

    const totals = items.reduce(
      (acc, cur) => {
        acc.subtotal += cur.subtotal || 0;
        acc.total += cur.total || 0;
        acc.qty += cur.qty || 0;
        return acc;
      },
      { subtotal: 0, total: 0, qty: 0 }
    );

    res.json({ items, totals });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/reports/export/:type — export report as Excel
router.get('/export/:type', protect, async (req, res) => {
  try {
    const { type } = req.params;
    const { dateFrom, dateTo, branch, supplier, period = 'day', search, status } = req.query;

    let items = [];
    let sheetName = 'Report';

    if (type === 'sales' || type === 'services') {
      const invoiceType = type === 'sales' ? 'customer' : 'service';
      const matchStage = { invoiceType, ...buildDateMatch(dateFrom, dateTo) };

      if (branch) matchStage.storeBranch = require('mongoose').Types.ObjectId.createFromHexString(branch);
      if (status) {
        const statusRegex = new RegExp(`^${status}$`, 'i');
        matchStage.$or = [{ paymentStatus: statusRegex }, { status: statusRegex }];
      }

      let rawItems = await Invoice.find(matchStage)
        .populate('customer', 'name email')
        .populate('employee', 'firstName lastName')
        .populate('storeBranch', 'name')
        .sort({ createdAt: -1 })
        .lean();

      items = rawItems.map((inv) => ({
        InvoiceNo: inv.invoiceNo,
        Date: new Date(inv.createdAt).toLocaleDateString(),
        Customer: inv.customer?.name || '',
        Employee: inv.employee ? `${inv.employee.firstName} ${inv.employee.lastName}` : '',
        Branch: inv.storeBranch?.name || '',
        Subtotal: inv.subtotal || 0,
        Discount: inv.discount || 0,
        VAT: inv.vatAmount || 0,
        Total: inv.total || 0,
        Status: inv.paymentStatus || inv.status || '',
      }));

      if (search) {
        const searchRegex = new RegExp(search, 'i');
        const numericSearch = Number(search);
        items = items.filter((item) => {
          return [
            String(item.InvoiceNo || ''),
            String(item.Customer || ''),
            String(item.Employee || ''),
            String(item.Branch || ''),
            String(item.Status || ''),
          ].some((value) => searchRegex.test(value))
            || (!Number.isNaN(numericSearch) && (
              Number(item.Subtotal) === numericSearch ||
              Number(item.Total) === numericSearch ||
              Number(item.VAT) === numericSearch
            ));
        });
      }

      sheetName = type === 'sales' ? 'Sales' : 'Services';

    } else if (type === 'sub-dealer-invoices') {
      const matchStage = { invoiceType: 'sub-dealer', ...buildDateMatch(dateFrom, dateTo) };
      if (branch) matchStage.storeBranch = require('mongoose').Types.ObjectId.createFromHexString(branch);
      if (status) {
        const statusRegex = new RegExp(`^${status}$`, 'i');
        matchStage.$or = [{ paymentStatus: statusRegex }, { status: statusRegex }];
      }

      let rawItems = await Invoice.find(matchStage)
        .populate('subDealer', 'name')
        .populate('storeBranch', 'name')
        .sort({ createdAt: -1 })
        .lean();

      items = rawItems.map((inv) => ({
        Date: new Date(inv.invoiceDate || inv.createdAt).toLocaleDateString(),
        'Invoice No': inv.invoiceNo,
        'Sub Dealer': inv.subDealer?.name || '',
        Branch: inv.storeBranch?.name || '',
        Subtotal: inv.subtotal || 0,
        VAT: inv.vatAmount || 0,
        Total: inv.total || 0,
      }));

      if (search) {
        const searchRegex = new RegExp(search, 'i');
        const numericSearch = Number(search);
        items = items.filter((item) => {
          return (
            searchRegex.test(String(item['Invoice No'] || '')) ||
            searchRegex.test(String(item['Sub Dealer'] || '')) ||
            searchRegex.test(String(item.Branch || '')) ||
            searchRegex.test(String(item.Date || '')) ||
            (!Number.isNaN(numericSearch) &&
              (Number(item.Subtotal) === numericSearch ||
                Number(item.VAT) === numericSearch ||
                Number(item.Total) === numericSearch))
          );
        });
      }

      sheetName = 'SubDealerInvoices';

    } else if (type === 'supplier') {
      const matchStage = { ...buildDateMatch(dateFrom, dateTo) };
      if (supplier) matchStage.supplier = require('mongoose').Types.ObjectId.createFromHexString(supplier);
      if (status) {
        matchStage.status = new RegExp(`^${status}$`, 'i');
      }

      let rawItems = await PurchaseOrder.find(matchStage)
        .populate('supplier', 'name')
        .populate('warehouse', 'name')
        .sort({ createdAt: -1 })
        .lean();

      items = rawItems.map((po) => ({
        InvoiceNo: po.invoiceNo,
        Date: new Date(po.createdAt).toLocaleDateString(),
        Supplier: po.supplier?.name || '',
        Warehouse: po.warehouse?.name || '',
        Type: po.type || '',
        Subtotal: po.subtotal || 0,
        VAT: po.vatAmount || 0,
        TotalAmount: po.totalAmount || 0,
        Status: po.status || '',
      }));

      if (search) {
        const searchRegex = new RegExp(search, 'i');
        const numericSearch = Number(search);
        items = items.filter((item) => {
          return [
            String(item.InvoiceNo || ''),
            String(item.Supplier || ''),
            String(item.Warehouse || ''),
            String(item.Status || ''),
          ].some((value) => searchRegex.test(value))
            || (!Number.isNaN(numericSearch) && (
              Number(item.Subtotal) === numericSearch ||
              Number(item.TotalAmount) === numericSearch ||
              Number(item.VAT) === numericSearch
            ));
        });
      }

      sheetName = 'SupplierOrders';
    } else {
      return res.status(400).json({ message: 'Invalid report type. Use: sales, services, or supplier' });
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(items);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Disposition', `attachment; filename="${type}-report.xlsx"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/reports/stock-status — stock status report
router.get('/stock-status', protect, async (req, res) => {
  try {
    const Inventory = require('../models/Inventory');
    const { warehouse } = req.query;
    const match = {};
    if (warehouse) match.warehouse = require('mongoose').Types.ObjectId.createFromHexString(warehouse);

    const items = await Inventory.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$stockStatus',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalCost: { $sum: '$totalCost' },
        },
      },
      { $sort: { '_id': 1 } },
    ]);

    res.json({ items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/reports/sub-dealer-invoices — aggregate or raw sub-dealer invoice lines
router.get('/sub-dealer-invoices', protect, async (req, res) => {
  try {
    const {
      dateFrom,
      dateTo,
      branch,
      branchId,
      period = 'day',
      raw,
      search,
      status,
    } = req.query;

    const branchParam = branch || branchId;

    const matchStage = {
      invoiceType: 'sub-dealer',
      ...buildDateMatch(dateFrom, dateTo),
    };

    if (branchParam) {
      matchStage.storeBranch = require('mongoose').Types.ObjectId.createFromHexString(branchParam);
    }

    if (status) {
      const statusRegex = new RegExp(`^${status}$`, 'i');
      matchStage.$or = [{ paymentStatus: statusRegex }, { status: statusRegex }];
    }

    // raw mode: one row per invoice (good for printing)
    if (raw === 'true' || raw === true) {
      const invoices = await Invoice.find(matchStage)
        .populate('subDealer', 'name')
        .populate('storeBranch', 'name')
        .sort({ createdAt: -1 })
        .lean();

      let items = invoices.map((inv) => ({
        // Keep both Date forms so search can match raw input (-Date column) reliably.
        invoiceDate: inv.invoiceDate || inv.createdAt,
        invoiceDateDisplay: inv.invoiceDate || inv.createdAt,
        invoiceNo: inv.invoiceNo,
        subDealer: inv.subDealer || {},
        branch: inv.storeBranch || {},
        subtotal: inv.subtotal || 0,
        vatAmount: inv.vatAmount || 0,
        total: inv.total || 0,
        status: inv.paymentStatus || inv.status || 'pending',

        // fields used by /reports/export/... to generate Excel with correct headers
        Date: new Date(inv.invoiceDate || inv.createdAt).toLocaleDateString(),
        InvoiceNo: inv.invoiceNo,
        SubDealer: inv.subDealer?.name || '',
        Branch: inv.storeBranch?.name || '',
        Subtotal: inv.subtotal || 0,
        VAT: inv.vatAmount || 0,
        Total: inv.total || 0,
        TotalAmount: inv.total || 0,
        PaymentStatus: inv.paymentStatus || inv.status || 'pending',
      }));

      if (search) {
        const searchRegex = new RegExp(search, 'i');
        const numericSearch = Number(search);

        items = items.filter((item) => {
          // Match against visible columns:
          // -Date, Invoice No, Sub Dealer, Branch, Subtotal, VAT, Total.
          return (
            // -Date
            (item.invoiceDateDisplay
              ? searchRegex.test(String(item.invoiceDateDisplay))
              : false) ||
            // Invoice No
            searchRegex.test(String(item.invoiceNo || '')) ||
            // Sub Dealer
            searchRegex.test(String(item.subDealer?.name || '')) ||
            // Branch
            searchRegex.test(String(item.branch?.name || '')) ||
            // Subtotal, VAT, Total (exact numeric match)
            (!Number.isNaN(numericSearch) &&
              (Number(item.subtotal) === numericSearch ||
                Number(item.vatAmount) === numericSearch ||
                Number(item.total) === numericSearch))
          );
        });
      }

      const totals = items.reduce(
        (acc, cur) => {
          acc.count += 1;
          acc.subtotal += cur.subtotal || 0;
          acc.vatAmount += cur.vatAmount || 0;
          acc.total += cur.total || 0;
          return acc;
        },
        { count: 0, subtotal: 0, vatAmount: 0, total: 0 }
      );

      return res.json({ items, totals });
    }

    // aggregated mode
    const pipeline = [
      { $match: matchStage },
      {
        $group: {
          _id: buildGroupId(period),
          subtotal: { $sum: '$subtotal' },
          vatAmount: { $sum: '$vatAmount' },
          total: { $sum: '$total' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
    ];

    const items = await Invoice.aggregate(pipeline);

    const totals = items.reduce(
      (acc, cur) => {
        acc.subtotal += cur.subtotal || 0;
        acc.vatAmount += cur.vatAmount || 0;
        acc.total += cur.total || 0;
        acc.count += cur.count || 0;
        return acc;
      },
      { count: 0, subtotal: 0, vatAmount: 0, total: 0 }
    );

    res.json({ items, totals });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
