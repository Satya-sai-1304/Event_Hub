const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  bookingId: { type: String, required: true },
  userId: { type: String, required: true },
  merchantId: { type: String, required: true },
  eventId: { type: String, required: true },
  bookingType: { 
    type: String, 
    enum: ['ticketed', 'full_service'], 
    required: true 
  },
  totalAmount: { type: Number, required: true },
  adminCommission: { type: Number, required: true },
  merchantEarnings: { type: Number, required: true },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'paid', 'failed'], 
    default: 'paid' 
  },
  paymentId: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Transaction', transactionSchema);
