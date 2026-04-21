const mongoose = require('mongoose');

const issuedTicketSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  userId: { type: String, required: true },
  ticketId: { type: String, required: true },
  ticketName: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  qrCode: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('IssuedTicket', issuedTicketSchema);
