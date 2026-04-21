const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['pending', 'resolved', 'ignored'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date },
  adminNotes: { type: String }
});

module.exports = mongoose.model('Complaint', complaintSchema);