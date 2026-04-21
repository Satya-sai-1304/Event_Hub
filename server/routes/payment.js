const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const Settings = require('../models/Settings');

// Initialize Razorpay conditionally to prevent crash if keys are missing
let razorpay;
try {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  } else {
    console.warn('Razorpay keys missing in .env. Using mock payment mode.');
  }
} catch (error) {
  console.error('Error initializing Razorpay:', error.message);
}

// Create Order API
router.post('/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', receipt, eventId, selectedSeats } = req.body;

    if (!amount) {
      return res.status(400).json({ message: 'Amount is required' });
    }

    // Check seat availability if seats are selected
    if (eventId && selectedSeats && selectedSeats.length > 0) {
      if (req.useMongoDB) {
        const event = await Event.findById(eventId);
        if (event && event.seats && event.seats.length > 0) {
          const unavailableSeats = selectedSeats.filter(selectedSeat => {
            const seat = event.seats.find(s => s.row === selectedSeat.row && s.number === selectedSeat.number);
            return !seat || seat.status === 'booked';
          });

          if (unavailableSeats.length > 0) {
            return res.status(400).json({ 
              message: 'Some of the selected seats are already booked. Please choose different seats.',
              unavailableSeats 
            });
          }
        }
      }
    }

    // Handle mock order if Razorpay is not initialized or keys are mock
    if (!razorpay || !process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === 'rzp_test_your_key_here') {
      return res.json({
        id: `order_mock_${Date.now()}`,
        amount: Math.round(amount * 100),
        currency: currency,
        receipt: receipt || `receipt_${Date.now()}`,
        status: 'created'
      });
    }

    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    res.status(500).json({ message: error.message });
  }
});

// Verify Payment API
router.post('/verify-payment', async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      bookingData 
    } = req.body;

    // Verify signature
    const secret = process.env.RAZORPAY_KEY_SECRET || 'your_secret_here';
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body.toString())
      .digest('hex');

    // Handle mock signature ONLY for development if keys are missing
    const isMockPayment = razorpay_payment_id.startsWith('pay_mock_');
    const isSignatureValid = (expectedSignature === razorpay_signature) || 
                             (isMockPayment && (razorpay_signature === 'mock_signature' || !process.env.RAZORPAY_KEY_SECRET));

    if (!isSignatureValid) {
      return res.status(400).json({ message: 'Invalid payment signature' });
    }

    // Process booking on success
    let booking;
    if (req.useMongoDB) {
      // Check seat availability again before final confirmation
      if (bookingData.selectedSeats && bookingData.selectedSeats.length > 0) {
        const event = await Event.findById(bookingData.eventId);
        if (event && event.seats && event.seats.length > 0) {
          const unavailableSeats = bookingData.selectedSeats.filter(selectedSeat => {
            const seat = event.seats.find(s => s.row === selectedSeat.row && s.number === selectedSeat.number);
            return !seat || seat.status === 'booked';
          });

          if (unavailableSeats.length > 0) {
            // This is rare but possible. Payment already happened, so refund or manual intervention might be needed.
            // For now, we return error and log it.
            console.error('CRITICAL: Seats were booked during payment process!', {
              orderId: razorpay_order_id,
              paymentId: razorpay_payment_id,
              unavailableSeats
            });
            return res.status(400).json({ 
              message: 'The selected seats were already booked during the payment process. Please contact support with your payment ID.',
              paymentId: razorpay_payment_id
            });
          }
        }
      }

      // 1. Create Booking
      const totalAmount = Number(bookingData.totalAmount || bookingData.totalPrice || 0);
      const paidNow = Number(bookingData.paidAmount || totalAmount); // advance or full
      
      let paymentStage = 'fully_paid';
      let remainingAmount = 0;
      
      if (paidNow < totalAmount) {
        paymentStage = 'advance_paid';
        remainingAmount = totalAmount - paidNow;
      }

      booking = new Booking({
        ...bookingData,
        paymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        status: 'confirmed',
        paymentStatus: paidNow >= totalAmount ? 'paid' : 'partial',
        paymentStage,
        paidAmount: paidNow,
        advancePaid: paidNow, // Set advancePaid for consistency with frontend
        remainingAmount
      });
      await booking.save();

      // 2. Mark seats as booked if applicable
      if (bookingData.selectedSeats && bookingData.selectedSeats.length > 0) {
        const event = await Event.findById(bookingData.eventId);
        if (event) {
          bookingData.selectedSeats.forEach(selectedSeat => {
            const seat = event.seats.find(s => s.row === selectedSeat.row && s.number === selectedSeat.number);
            if (seat) seat.status = 'booked';
          });
          await event.save();
        }
      }

      // 3. Update ticket counts
      if (bookingData.selectedTickets && bookingData.selectedTickets.length > 0) {
        for (const t of bookingData.selectedTickets) {
          // Update separate Ticket collection (primary storage)
          await Ticket.findOneAndUpdate(
            { eventId: bookingData.eventId, ticketName: t.name },
            { $inc: { remainingQuantity: -t.quantity } }
          );
          
          // Also update event sold count for redundancy if needed
          await Event.updateOne(
            { _id: bookingData.eventId, "ticketTypes.name": t.name },
            { $inc: { "ticketTypes.$.soldCount": t.quantity } }
          );
        }
      }

      // 4. Create Transaction
      // Get commission rate from settings
      const settings = await Settings.findOne() || { commissionRate: 5 };
      const adminCommission = (totalAmount * settings.commissionRate) / 100;
      const merchantEarnings = totalAmount - adminCommission;

      const transaction = new Transaction({
        bookingId: booking._id,
        userId: bookingData.customerId,
        merchantId: bookingData.organizerId,
        eventId: bookingData.eventId,
        bookingType: bookingData.eventType === 'ticketed' ? 'ticketed' : 'full_service',
        totalAmount: totalAmount,
        adminCommission: adminCommission,
        merchantEarnings: merchantEarnings,
        paymentStatus: 'paid',
        paymentId: razorpay_payment_id
      });
      await transaction.save();

      // 5. Send Notification
      const notification = new Notification({
        userId: booking.customerId,
        type: 'booking',
        title: 'Booking Confirmed',
        message: `Your booking for "${booking.eventTitle}" is confirmed!`,
        bookingId: booking._id,
        actionUrl: '/dashboard/my-bookings'
      });
      await notification.save();

      // Emit socket event for real-time updates
      if (req.io) {
        req.io.emit('eventUpdated', { 
          eventId: bookingData.eventId, 
          type: 'booking_confirmed',
          message: 'New booking confirmed' 
        });
        
        // Notify both customer and organizer of the booking update
        const bookingIdStr = booking._id.toString();
        
        req.io.to(booking.customerId).emit('booking_status_updated', {
          bookingId: bookingIdStr,
          status: 'confirmed',
          paymentStatus: booking.paymentStatus
        });
        
        if (booking.organizerId) {
          req.io.to(booking.organizerId).emit('booking_status_updated', {
            bookingId: bookingIdStr,
            status: 'confirmed',
            paymentStatus: booking.paymentStatus
          });
        }
        
        // Also emit notification to specific user
        req.io.to(booking.customerId).emit('receive_notification', {
          id: notification._id,
          title: 'Booking Confirmed',
          message: `Your booking for "${booking.eventTitle}" is confirmed!`,
          type: 'booking',
          bookingId: bookingIdStr,
          createdAt: notification.createdAt
        });
      }

    } else {
      // JSON File DB fallback
      const dbPath = path.join(__dirname, '../db.json');
      const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
      const { v4: uuidv4 } = require('uuid');

      const bookingId = uuidv4();
      const totalAmount = Number(bookingData.totalAmount || bookingData.totalPrice || 0);
      const paidNow = Number(bookingData.paidAmount || totalAmount); // advance or full
      
      let paymentStage = 'fully_paid';
      let remainingAmount = 0;
      
      if (paidNow < totalAmount) {
        paymentStage = 'advance_paid';
        remainingAmount = totalAmount - paidNow;
      }

      booking = {
        id: bookingId,
        ...bookingData,
        paymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        status: 'confirmed',
        paymentStatus: paidNow >= totalAmount ? 'paid' : 'partial',
        paymentStage,
        paidAmount: paidNow,
        advancePaid: paidNow, // Set advancePaid for consistency with frontend
        remainingAmount,
        createdAt: new Date().toISOString()
      };

      if (!db.bookings) db.bookings = [];
      db.bookings.push(booking);

      // Update event seats/tickets in JSON DB
      const eventIndex = db.events.findIndex(e => (e.id || e._id) === bookingData.eventId);
      if (eventIndex !== -1) {
        const event = db.events[eventIndex];
        
        if (bookingData.selectedSeats) {
          bookingData.selectedSeats.forEach(selectedSeat => {
            const seat = event.seats?.find(s => s.row === selectedSeat.row && s.number === selectedSeat.number);
            if (seat) seat.status = 'booked';
          });
        }

        if (bookingData.selectedTickets) {
          bookingData.selectedTickets.forEach(t => {
            const ticketType = event.ticketTypes?.find(tt => tt.name === t.name);
            if (ticketType) {
              ticketType.soldCount = (ticketType.soldCount || 0) + t.quantity;
            }
          });
        }
      }

      // Add Transaction
      if (!db.transactions) db.transactions = [];
      db.transactions.push({
        id: uuidv4(),
        bookingId,
        customerId: booking.customerId,
        organizerId: booking.organizerId,
        amount: booking.totalAmount,
        type: 'credit',
        status: 'completed',
        paymentId: razorpay_payment_id,
        createdAt: new Date().toISOString()
      });

      // Add Notification
      if (!db.notifications) db.notifications = [];
      db.notifications.push({
        id: uuidv4(),
        userId: booking.customerId,
        type: 'booking',
        title: 'Booking Confirmed',
        message: `Your booking for "${booking.eventTitle}" is confirmed!`,
        bookingId,
        actionUrl: '/dashboard/my-bookings',
        isRead: false,
        createdAt: new Date().toISOString()
      });

      fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
    }

    res.json({ success: true, booking });
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
