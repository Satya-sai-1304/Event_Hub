const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: false },
  role: { type: String, enum: ['admin', 'organizer', 'customer'], default: 'customer' },
  googleId: { type: String },
  githubId: { type: String },
  profileImage: { type: String },
  status: { type: String, enum: ['active', 'invited'], default: 'active' },
  isApproved: { type: Boolean, default: false },
  otp: { type: String },
  otpExpires: { type: Date },
  inviteToken: { type: String },
  inviteTokenExpiry: { type: Date },
  services: [String], // Services offered by merchant
  images: [String], // Portfolio images for merchant
  description: { type: String }, // About merchant
  location: {
    lat: { type: Number },
    lng: { type: Number },
    address: { type: String }
  },
  rating: { type: Number, default: 0 },
  
  // AI Recommendation Tracking
  interests: [String], // Category names the user is interested in
  activity: [{
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
    type: { type: String, enum: ['click', 'search', 'book'] },
    timestamp: { type: Date, default: Date.now }
  }],

  // Push Notifications
  deviceToken: { type: String },

  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);
