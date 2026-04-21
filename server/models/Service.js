const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', optional: true },
  category: { 
    type: String, 
    required: false, 
  },
  type: { 
    type: String, 
    required: true,
  },
  price: { type: Number },
  basePrice: { type: Number }, // Alias for price as per new architecture
  perPlatePrice: { type: Number }, // For Catering
  minGuests: { type: Number }, // For Catering
  description: { type: String },
  image: { type: String },
  images: [{ type: String }],
  foodType: { type: String, enum: ['Veg', 'Non Veg'] }, // For Catering
  merchantId: { type: String, required: true }, // Service belongs to a merchant
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

// Unique name per merchant
serviceSchema.index({ name: 1, merchantId: 1 }, { unique: true });

module.exports = mongoose.model('Service', serviceSchema);
