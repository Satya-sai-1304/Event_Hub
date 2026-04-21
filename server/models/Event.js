const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  price: { type: Number, required: true },
  basePrice: { type: Number, default: 0 },
  location: { type: String, required: true },
  locationDetails: {
    liveLocation: {
      lat: Number,
      lng: Number,
      address: String
    },
    manualLocation: String
  },
  eventDate: { type: Date, required: true },
  image: { type: String, required: true },
  status: { type: String, enum: ['upcoming', 'live', 'completed', 'cancelled'], default: 'upcoming' },
  organizerId: { type: String, required: true },
  organizerName: { type: String, required: true },
  capacity: { type: Number, required: true },
  dailyCapacity: { type: Number, default: 1 }, // Added for full-service events
  isSoldOut: { type: Boolean, default: false },
  
  // Event type: determines the booking flow
  eventType: { 
    type: String, 
    enum: ['full-service', 'ticketed'], 
    default: 'full-service' 
  },
  
  // For ticketed events (concerts, sports)
  ticketInfo: {
    qrCodeEnabled: { type: Boolean, default: false },
    ticketUrl: { type: String },
    seatingChart: { type: String },
  },
  
  // Ticket types for ticketed events
  ticketTypes: [{
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    earlyBirdPrice: { type: Number },
    soldCount: { type: Number, default: 0 }
  }],
  
  // Services included in the event package
  services: {
    food: { type: Boolean, default: false },
    snacks: { type: Boolean, default: false },
    decoration: { type: Boolean, default: false },
    photography: { type: Boolean, default: false },
    music: { type: Boolean, default: false },
    entertainment: { type: Boolean, default: false }
  },
  
  // Event-specific selectable options (Add-ons)
  addons: [{
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String }
  }],
  
  // Additional event details
  highlights: [String], // Array of key features
  images: [String], // Multiple images for gallery

  // Live Stream Info
  liveStreamUrl: { type: String, default: "" },
  isLiveStream: { type: Boolean, default: false },
  
  // Decoration themes available for this event
  decorationThemes: [{
    name: String,
    image: String,
    description: String
  }],
  
  createdAt: { type: Date, default: Date.now },
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Duplicate the _id field to id
eventSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Pre-save middleware to automatically set event status based on date
// Using async/await with Promise-style for Mongoose 8.x compatibility
eventSchema.pre('save', async function() {
  const now = new Date();
  const eventDate = new Date(this.eventDate);
  
  // If event date has passed and status is not already completed or cancelled
  // For full-service events, we don't auto-complete based on date as they are managed manually
  if (this.eventType !== 'full-service' && eventDate < now && this.status !== 'completed' && this.status !== 'cancelled') {
    this.status = 'completed';
  }
  
  // If event date is today or within next 24 hours, mark as live
  // For full-service events, we can mark them as live by default if they are upcoming
  const hoursUntilEvent = (eventDate - now) / (1000 * 60 * 60);
  if (this.eventType === 'full-service' && this.status === 'upcoming') {
    this.status = 'live';
  } else if (hoursUntilEvent >= 0 && hoursUntilEvent <= 24 && this.status === 'upcoming') {
    this.status = 'live';
  }
  
  // No need to call next() in async style
});

module.exports = mongoose.model('Event', eventSchema);
