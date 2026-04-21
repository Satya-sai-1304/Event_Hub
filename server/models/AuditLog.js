const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  module: { type: String, required: true },
  userId: { type: String, required: true },
  userName: { type: String },
  details: { type: mongoose.Schema.Types.Mixed },
  ipAddress: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AuditLog', auditLogSchema);