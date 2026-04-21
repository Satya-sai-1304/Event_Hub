const mongoose = require('mongoose');

const gallerySchema = new mongoose.Schema({
  serviceId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Service', 
    required: true 
  },
  merchantId: { 
    type: String, 
    required: true 
  },
  imageUrl: { 
    type: String, 
    required: true 
  },
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
  title: { 
    type: String 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
});

module.exports = mongoose.model('Gallery', gallerySchema);