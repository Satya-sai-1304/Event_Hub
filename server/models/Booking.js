const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
  serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
  eventTitle: { type: String },
  serviceName: { type: String },
  vendorId: { type: String },
  eventType: { type: String, enum: ['full-service', 'ticketed', 'service'] }, // Type of event/service
  userId: { type: String }, // User ID alias for consistency
  customerId: { type: String, required: true },
  customerName: { type: String, required: true },
  customerEmail: { type: String, required: true },
  eventDate: { type: Date, required: true },
  timeSlot: { type: String, enum: ['day', 'night'] },
  guests: { type: Number },
  totalPrice: { type: Number, required: true },
  status: { 
    type: String, 
    enum: [
      'pending', 
      'approved', 
      'confirmed', 
      'rejected',
      'pending_admin', 
      'pending_merchant_approval', 
      'pending_billing', 
      'pending_merchant',
      'handed_to_merchant',
      'bill_sent', 
      'payment_pending', 
      'paid',
      'accepted',
      'completed', 
      'cancelled',
      'used',
      'plan_sent'
    ], 
    default: 'pending' 
  },
  organizerId: { type: String },
  
  // Ticket details for QR generation
  ticketId: { type: String },
  qrCode: { type: String },
  ticketType: { type: String },
  quantity: { type: Number, default: 1 },
  selectedTickets: [{
    name: String,
    quantity: Number,
    price: Number
  }],
  totalAmount: { type: Number }, 
  paymentStatus: { type: String, enum: ['unpaid', 'paid', 'pending', 'failed'], default: 'unpaid' },
  paymentStage: { type: String, enum: ['pending', 'advance_paid', 'fully_paid'], default: 'pending' },
  remainingAmount: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  
  // Customer requirements for full-service events
  customerRequirements: {
    eventDate: { type: Date },
    timeSlot: { type: String, enum: ['day', 'night'] },
    numberOfGuests: { type: Number },
    additionalNotes: { type: String }
  },
  
  // Selected services for full-service events (old structure)
  selectedServices: {
    decoration: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
    catering: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
    music: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
    lighting: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
  },
  
  // Selected add-ons for full-service events (new architecture)
  selectedAddons: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Service' }],
  
  // Billing details for itemized costs
  billingDetails: {
    decorationCost: { type: Number, default: 0 },
    cateringCost: { type: Number, default: 0 },
    musicCost: { type: Number, default: 0 },
    lightingCost: { type: Number, default: 0 },
    addons: [{
      name: String,
      price: Number,
      category: String
    }],
    additionalCharges: { type: Number, default: 0 },
    subtotal: { type: Number },
    tax: { type: Number, default: 0 },
    finalTotal: { type: Number }
  },
  
  // Payment and billing details
  additionalCost: { type: Number, default: 0 },
  billQrCode: { type: String },
  couponCode: { type: String },
  couponDiscount: { type: Number, default: 0 },
  convenienceFee: { type: Number, default: 0 },
  finalAmount: { type: Number },
  paymentId: { type: String },
  receiptUrl: { type: String },
  advanceAmount: { type: Number, default: 0 },
  advancePaid: { type: Number, default: 0 },
  
  // Invoice details
  invoiceNumber: { type: String },
  invoiceGeneratedAt: { type: Date },
  
  // Event plan details (for full-service events like weddings, birthdays)
  eventPlan: {
    theme: { type: String },
    decoration: { type: String },
    menuItems: [String],
    photography: { type: Boolean, default: false },
    musicDJ: { type: Boolean, default: false },
    entertainment: [String],
    specialRequests: { type: String },
    estimatedPrice: { type: Number },
    timeline: [{
      time: String,
      activity: String
    }]
  },
  
  // Cancellation details
  cancellationReason: { type: String },
  cancelledAt: { type: Date },
  
  // Refund Management
  refundStatus: { 
    type: String, 
    enum: ['none', 'pending', 'approved', 'rejected'], 
    default: 'none' 
  },
  refundReason: { type: String },
  refundAmount: { type: Number },
  refundedAt: { type: Date },
  refundTransactionId: { type: String },

  // Rating and Review details
  isRated: { type: Boolean, default: false },
  rating: { type: Number },
  review: { type: String },
  ratedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
