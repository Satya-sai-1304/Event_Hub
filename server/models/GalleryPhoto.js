const mongoose = require('mongoose');

const galleryPhotoSchema = new mongoose.Schema({
  serviceId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Service',
    required: false // Optional for generic gallery photos
  },
  serviceName: { type: String },
  merchantId: { type: String, required: true },
  merchantName: { type: String },
  imageUrl: { type: String, required: true },
  caption: { type: String },
  category: { 
    type: String, 
    required: true,
    enum: [
      'Wedding Decor', 
      'Birthday Decoration', 
      'Mandap Design', 
      'Stage Decoration', 
      'Outdoor Events'
    ]
  },
  uploadedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('GalleryPhoto', galleryPhotoSchema);