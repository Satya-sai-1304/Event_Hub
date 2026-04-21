const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  platformName: { type: String, default: 'Event Hub' },
  contactEmail: { type: String },
  contactPhone: { type: String },
  commissionRate: { type: Number, default: 5 }, // 5% default
  maintenanceMode: { type: Boolean, default: false },
  currency: { type: String, default: 'INR' },
  updatedBy: { type: String },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Settings', settingsSchema);