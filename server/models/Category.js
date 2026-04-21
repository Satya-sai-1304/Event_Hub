const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  merchantId: { type: String }, // Optional for global categories
  isGlobal: { type: Boolean, default: false }, // true = service type, false = category
  createdAt: { type: Date, default: Date.now },
});

// Unique name per merchant per type (sparse index allows multiple null merchantIds)
categorySchema.index({ name: 1, merchantId: 1, isGlobal: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Category', categorySchema);
