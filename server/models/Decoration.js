const mongoose = require('mongoose');

const decorationSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true,
    trim: true
  },
  image: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String, 
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    default: 0
  },
  category: {
    type: String,
    enum: ['wedding', 'birthday', 'corporate', 'party', 'all'],
    default: 'all'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: String,
    default: 'admin'
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
});

module.exports = mongoose.model('Decoration', decorationSchema);
