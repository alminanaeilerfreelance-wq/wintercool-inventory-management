const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema(
  {
    inventory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Inventory',
    },
    service: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
    },
    itemName: {
      type: String,
      trim: true,
    },
    serialNo: {
      type: String,
      trim: true,
    },
    serviceName: {
      type: String,
      trim: true,
    },
    quantity: {
      type: Number,
    },
    price: {
      type: Number,
    },
    subtotal: {
      type: Number,
    },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    invoiceDate: {
      type: Date,
      default: () => new Date(),
    },
    invoiceType: {
      type: String,
      enum: ['customer', 'service', 'sub-dealer', 'purchase_order', 'return_purchase_order'],
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
    },
    customerName: {
      type: String,
      trim: true,
    },
    customerEmail: {
      type: String,
      trim: true,
      lowercase: true,
    },
    customerContact: {
      type: String,
      trim: true,
    },
    customerAddress: {
      type: String,
      trim: true,
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
    },
    subDealer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubDealer',
    },
employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    installer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
    },
    storeBranch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StoreBranch',
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
    },
    items: [invoiceItemSchema],
    subtotal: {
      type: Number,
    },
    discount: {
      type: Number,
      default: 0,
    },
    discountType: {
      type: String,
      enum: ['fixed', 'percent'],
      default: 'fixed',
    },
    vatAmount: {
      type: Number,
      default: 0,
    },
    vatType: {
      type: String,
      enum: ['inclusive', 'exclusive', 'none'],
      default: 'none',
    },
    total: {
      type: Number,
    },
    notes: {
      type: String,
      trim: true,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'open', 'paid', 'cancelled', 'due'],
      default: 'pending',
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    qrCode: {
      type: String,
    },
    calendarEventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CalendarEvent',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    totalPaid: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Invoice', invoiceSchema);
