const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  bookingId: { type: String, required: true },
  eventId: { type: String, required: true },
  eventTitle: { type: String, required: true },
  customerId: { type: String, required: true },
  customerName: { type: String, required: true },
  organizerId: { type: String, required: true },
  
  // Rating (1-5 stars)
  rating: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 5 
  },
  
  // Review text
  comment: { type: String },
  
  // Individual category ratings
  ratings: {
    overall: { type: Number, min: 1, max: 5 },
    service: { type: Number, min: 1, max: 5 },
    value: { type: Number, min: 1, max: 5 },
    quality: { type: Number, min: 1, max: 5 }
  },
  
  // Photos from customer (optional)
  photos: [String],
  
  // Helpful votes
  helpfulVotes: { type: Number, default: 0 },
  
  // Organizer response
  organizerResponse: {
    comment: { type: String },
    respondedAt: { type: Date }
  },
  
  // Moderation
  isApproved: { type: Boolean, default: true },
  isFlagged: { type: Boolean, default: false },
  
  createdAt: { type: Date, default: Date.now },
});

// Index for efficient queries
reviewSchema.index({ eventId: 1, createdAt: -1 });
reviewSchema.index({ customerId: 1 });
reviewSchema.index({ organizerId: 1 });

module.exports = mongoose.model('Review', reviewSchema);
