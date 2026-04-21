const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema({
  merchantId: { type: String, required: true },
  amount: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'paid', 'rejected'], 
    default: 'pending' 
  },
  requestedAt: { type: Date, default: Date.now },
  paidAt: { type: Date },
  bankDetails: {
    accountNumber: { type: String },
    ifscCode: { type: String },
    bankName: { type: String },
    accountHolderName: { type: String }
  }
});

module.exports = mongoose.model('Payout', payoutSchema);
