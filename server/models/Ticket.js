const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  ticketName: { type: String, required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  price: { type: Number, required: true },
  earlyBirdPrice: { type: Number },
  earlyBirdEndDate: { type: Date },
  totalQuantity: { type: Number, required: true },
  remainingQuantity: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Ticket', ticketSchema);
