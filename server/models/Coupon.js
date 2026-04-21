const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  couponCode: { type: String, required: true },
  discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
  discountValue: { type: Number, required: true },
  minimumOrderAmount: { type: Number, default: 0 },
  expiryDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  merchantId: { type: String, required: true },
  isGlobal: { type: Boolean, default: true },
  applicableType: { type: String, enum: ['ALL', 'EVENT', 'CATEGORY', 'SERVICE'], default: 'ALL' },
  applicableEvents: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }],
  applicableServices: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
  applicableCategory: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', optional: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', optional: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', optional: true },
  serviceType: { type: String, optional: true }, // e.g. 'Catering', 'Decoration'
  serviceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
  usedBy: [{ type: String }],
  usageLimit: { type: Number, default: null }, // Maximum times coupon can be used
  usageCount: { type: Number, default: 0 } // Current usage count
});

// Coupon code should be unique per merchant
couponSchema.index({ couponCode: 1, merchantId: 1 }, { unique: true });

module.exports = mongoose.model('Coupon', couponSchema);
