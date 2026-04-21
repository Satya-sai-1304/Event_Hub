const mongoose = require('mongoose');

const serviceTypeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: false },
  merchantId: { type: String }, // Optional for global types
  isDefault: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

// Unique name per merchant or global
serviceTypeSchema.index({ name: 1, merchantId: 1, categoryId: 1 }, { unique: true });

module.exports = mongoose.model('ServiceType', serviceTypeSchema);
