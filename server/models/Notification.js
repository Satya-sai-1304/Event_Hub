const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['booking', 'payment', 'event', 'reminder', 'offer', 'message'],
    required: true 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  bookingId: { type: String },
  eventId: { type: String },
  actionUrl: { type: String }, // Optional URL for action
  createdAt: { type: Date, default: Date.now },
});

// Index for faster queries
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
