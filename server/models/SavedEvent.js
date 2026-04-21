const mongoose = require('mongoose');

const savedEventSchema = new mongoose.Schema({
  customerId: { type: String, required: true },
  eventId: { type: String, required: true },
  eventTitle: { type: String, required: true },
  eventImage: { type: String },
  eventPrice: { type: Number },
  eventDate: { type: Date },
  category: { type: String },
  savedAt: { type: Date, default: Date.now },
});

// Ensure unique combination of customer and event
savedEventSchema.index({ customerId: 1, eventId: 1 }, { unique: true });

module.exports = mongoose.model('SavedEvent', savedEventSchema);
