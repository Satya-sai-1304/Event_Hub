const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
  merchantId: { type: String, required: true, unique: true },
  totalEarnings: { type: Number, default: 0 },
  commissionDeducted: { type: Number, default: 0 },
  netBalance: { type: Number, default: 0 },
  pendingPayout: { type: Number, default: 0 },
  totalWithdrawn: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Wallet', walletSchema);
