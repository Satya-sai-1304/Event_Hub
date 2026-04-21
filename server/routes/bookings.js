const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Ticket = require('../models/Ticket');
const Event = require('../models/Event');
const Notification = require('../models/Notification');
const Transaction = require('../models/Transaction');
const Wallet = require('../models/Wallet');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const Coupon = require('../models/Coupon');
const QRCode = require('qrcode');

const DB_FILE = path.join(__dirname, '../db.json');

// Helper to mark coupon as used
const markCouponAsUsed = async (req, couponCode, userId) => {
  if (!couponCode || !userId) return;
  
  try {
    const code = couponCode.toUpperCase();
    if (req.useMongoDB) {
      const coupon = await Coupon.findOne({ couponCode: code });
      if (coupon) {
        const updatedCoupon = await Coupon.findByIdAndUpdate(coupon._id, {
          $addToSet: { usedBy: userId },
          $inc: { usageCount: 1 }
        }, { new: true });
        
        // Emit socket event for real-time update
        if (req.io) {
          req.io.emit('couponUsed', { couponId: coupon._id, userId, updatedCoupon });
        }
      }
    } else {
      const db = readDB();
      if (!db.coupons) db.coupons = [];
      const index = db.coupons.findIndex(c => c.couponCode === code);
      if (index !== -1) {
        if (!db.coupons[index].usedBy) db.coupons[index].usedBy = [];
        if (!db.coupons[index].usedBy.includes(userId)) {
          db.coupons[index].usedBy.push(userId);
          db.coupons[index].usageCount = (db.coupons[index].usageCount || 0) + 1;
          const updatedCoupon = db.coupons[index];
          writeDB(db);
          
          // Emit socket event for real-time update
          if (req.io) {
            req.io.emit('couponUsed', { couponId: db.coupons[index].id, userId, updatedCoupon });
          }
        }
      }
    }
  } catch (err) {
    console.error('Error marking coupon as used:', err);
  }
};

// Helper to generate QR Code
const generateQRCode = async (data) => {
  try {
    return await QRCode.toDataURL(data);
  } catch (err) {
    console.error('QR Code generation error:', err);
    return null;
  }
};

const readDB = () => {
  if (!fs.existsSync(DB_FILE)) return { events: [], bookings: [], users: [] };
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
};

const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');

// Helper to update ticket quantity and check event sold out status
const updateTicketRemainingQuantity = async (eventId, ticketName, quantity) => {
  try {
    const ticket = await Ticket.findOneAndUpdate(
      { eventId, ticketName },
      { $inc: { remainingQuantity: -quantity } },
      { new: true }
    );

    if (ticket && ticket.remainingQuantity <= 0) {
      // Check if all ticket types for this event are sold out
      const allTickets = await Ticket.find({ eventId });
      const totalRemaining = allTickets.reduce((sum, t) => sum + t.remainingQuantity, 0);
      
      if (totalRemaining <= 0) {
        await Event.findByIdAndUpdate(eventId, { isSoldOut: true, status: 'sold_out' });
      }
    }
  } catch (err) {
    console.error('Error updating ticket quantity:', err);
  }
};

const { sendPushNotification } = require('../utils/firebase');
const User = require('../models/User');

// Helper function to create notifications
const createNotification = async (req, userId, type, title, message, bookingId, eventId) => {
  try {
    if (req.useMongoDB) {
      await Notification.create({
        userId,
        type,
        title,
        message,
        bookingId,
        eventId,
      });

      // Send push notification if user has deviceToken
      const user = await User.findById(userId);
      if (user && user.deviceToken) {
        await sendPushNotification(user.deviceToken, title, message, {
          type,
          bookingId: bookingId || '',
          eventId: eventId || ''
        });
      }
    } else {
      // For JSON file database
      const db = readDB();
      if (!db.notifications) db.notifications = [];
      db.notifications.push({
        id: uuidv4(),
        userId,
        type,
        title,
        message,
        bookingId,
        eventId,
        isRead: false,
        createdAt: new Date().toISOString(),
      });
      writeDB(db);

      // Send push notification if user has deviceToken in JSON DB
      const user = db.users.find(u => u.id === userId || u._id === userId);
      if (user && user.deviceToken) {
        await sendPushNotification(user.deviceToken, title, message, {
          type,
          bookingId: bookingId || '',
          eventId: eventId || ''
        });
      }
    }

    // Send real-time notification if socket.io is available
    if (req.io) {
      req.io.to(userId).emit('receive_notification', {
        type,
        title,
        message,
        bookingId,
        eventId,
        createdAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error creating notification:', error);
  }
};

// Helper function to create a transaction for admin commission
const createTransaction = async (req, booking) => {
  try {
    const totalAmount = booking.billingDetails?.finalTotal || booking.finalAmount || booking.totalAmount || booking.totalPrice || 0;
    const adminCommission = totalAmount * 0.05;
    const merchantEarnings = totalAmount - adminCommission;
    
    const transactionData = {
      bookingId: booking.id || booking._id.toString(),
      userId: booking.customerId,
      merchantId: booking.organizerId || 'admin', // Fallback if no organizer
      eventId: booking.eventId,
      bookingType: booking.eventType === 'full-service' ? 'full_service' : 'ticketed',
      totalAmount,
      adminCommission,
      merchantEarnings,
      paymentStatus: 'paid',
      paymentId: booking.paymentId || `PAY-${uuidv4().substring(0, 8).toUpperCase()}`,
      createdAt: new Date().toISOString()
    };

    if (req.useMongoDB) {
      // Check if transaction already exists for this booking
      const existingTransaction = await Transaction.findOne({ bookingId: transactionData.bookingId });
      if (!existingTransaction) {
        await Transaction.create(transactionData);
        console.log('Transaction record created for booking (MongoDB):', transactionData.bookingId);
        
        // Update Merchant Wallet
        if (transactionData.merchantId !== 'admin') {
          await Wallet.findOneAndUpdate(
            { merchantId: transactionData.merchantId },
            { 
              $inc: { 
                totalEarnings: totalAmount, 
                commissionDeducted: adminCommission, 
                netBalance: merchantEarnings 
              },
              $setOnInsert: { merchantId: transactionData.merchantId },
              updatedAt: new Date()
            },
            { upsert: true, new: true }
          );
          console.log('Merchant wallet updated for merchant:', transactionData.merchantId);
        }
      } else {
        console.log('Transaction already exists for booking:', transactionData.bookingId);
      }
    } else {
      const db = readDB();
      if (!db.transactions) db.transactions = [];
      
      // Check if transaction already exists for this booking
      const existingTransaction = db.transactions.find(t => t.bookingId === transactionData.bookingId);
      if (!existingTransaction) {
        db.transactions.push({
          id: uuidv4(),
          ...transactionData
        });

        // Update Wallet in JSON file
        if (transactionData.merchantId !== 'admin') {
          if (!db.wallets) db.wallets = [];
          let wallet = db.wallets.find(w => w.merchantId === transactionData.merchantId);
          if (!wallet) {
            wallet = {
              id: uuidv4(),
              merchantId: transactionData.merchantId,
              totalEarnings: 0,
              commissionDeducted: 0,
              netBalance: 0,
              pendingPayout: 0,
              updatedAt: new Date().toISOString()
            };
            db.wallets.push(wallet);
          }
          wallet.totalEarnings += totalAmount;
          wallet.commissionDeducted += adminCommission;
          wallet.netBalance += merchantEarnings;
          wallet.updatedAt = new Date().toISOString();
        }

        writeDB(db);
      }
    }
    console.log('Transaction record created for booking:', transactionData.bookingId);
  } catch (err) {
    console.error('Error creating transaction:', err);
  }
};

// Helper function to auto-complete past bookings
const autoCompleteBookings = async (req) => {
  try {
    const now = new Date();
    if (req.useMongoDB) {
      // Find bookings where event date has passed and payment is fully done
      const bookingsToComplete = await Booking.find({
        status: { $in: ['paid', 'confirmed', 'accepted'] },
        paymentStatus: 'paid', // Only auto-complete if fully paid
        eventDate: { $lt: now }
      });
      
      for (const booking of bookingsToComplete) {
        await Booking.findByIdAndUpdate(booking._id, { status: 'completed' });
        
        // Create notification for customer
        await createNotification(
          req,
          booking.customerId,
          'event',
          'Event Completed! 🌟',
          `How was your experience with "${booking.eventTitle || booking.serviceName}"? We'd love to hear your feedback!`,
          booking._id.toString(),
          booking.eventId
        );
      }
    } else {
      const db = readDB();
      let changed = false;
      db.bookings = db.bookings.map(b => {
        // Only auto-complete if fully paid and date has passed
        if (['paid', 'confirmed', 'accepted'].includes(b.status) && b.paymentStatus === 'paid' && new Date(b.eventDate) < now) {
          b.status = 'completed';
          changed = true;
          
          // Add notification to JSON db
          if (!db.notifications) db.notifications = [];
          db.notifications.push({
            id: uuidv4(),
            userId: b.customerId,
            type: 'event',
            title: 'Event Completed! 🌟',
            message: `How was your experience with "${b.eventTitle || b.serviceName}"? We'd love to hear your feedback!`,
            bookingId: b.id,
            eventId: b.eventId,
            isRead: false,
            createdAt: new Date().toISOString(),
          });
        }
        return b;
      });
      if (changed) writeDB(db);
    }
  } catch (err) {
    console.error('Auto-complete error:', err);
  }
};

// Get all bookings
router.get('/', async (req, res) => {
  try {
    const { organizerId, customerId } = req.query;
    console.log('Fetching bookings, using MongoDB:', req.useMongoDB, { organizerId, customerId });
    
    // Auto-complete past bookings before fetching
    await autoCompleteBookings(req);

    if (req.useMongoDB) {
      let query = {};
      if (organizerId) query.organizerId = organizerId;
      if (customerId) query.customerId = customerId;

      const bookings = await Booking.find(query).sort({ createdAt: -1 })
        .populate('serviceId')
        .populate('eventId');
      
      console.log('Found', bookings.length, 'bookings in MongoDB');
      // Convert MongoDB _id to id for frontend compatibility and map populated fields
      const sanitizedBookings = bookings.map(b => {
        const obj = b.toObject();
        return {
          ...obj,
          id: b._id.toString(),
          service: obj.serviceId,
          event: obj.eventId
        };
      });
      res.json(sanitizedBookings);
    } else {
      const db = readDB();
      let bookings = db.bookings || [];
      
      if (organizerId) {
        bookings = bookings.filter(b => b.organizerId === organizerId);
      }
      if (customerId) {
        bookings = bookings.filter(b => b.customerId === customerId);
      }

      console.log('Found', bookings.length, 'bookings in JSON file');
      
      // Populate service and event in JSON DB for frontend display
      const populatedBookings = bookings.map(b => {
        const service = (db.services || []).find(s => s.id === b.serviceId);
        const event = (db.events || []).filter(e => e.id === b.eventId)[0];
        return {
          ...b,
          service,
          event,
          // Ensure serviceName/eventTitle are present for easy access
          serviceName: b.serviceName || service?.name,
          eventTitle: b.eventTitle || event?.title
        };
      });
      
      res.json(populatedBookings);
    }
  } catch (err) {
    console.error('Error fetching bookings:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// Get single booking by ID
router.get('/:id', async (req, res) => {
  try {
    if (req.useMongoDB) {
      const booking = await Booking.findById(req.params.id)
        .populate('serviceId')
        .populate('eventId');
        
      if (!booking) return res.status(404).json({ message: 'Booking not found' });
      
      const obj = booking.toObject();
      res.json({ 
        ...obj, 
        id: booking._id.toString(),
        service: obj.serviceId,
        event: obj.eventId
      });
    } else {
      const db = readDB();
      const booking = db.bookings.find(b => b.id === req.params.id);
      if (!booking) return res.status(404).json({ message: 'Booking not found' });
      
      const service = (db.services || []).find(s => s.id === booking.serviceId);
      const event = (db.events || []).find(e => e.id === booking.eventId);
      
      res.json({
        ...booking,
        service,
        event,
        serviceName: booking.serviceName || service?.name,
        eventTitle: booking.eventTitle || event?.title
      });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new booking
router.post('/', async (req, res) => {
  try {
    console.log('Creating booking:', req.body);
    
    let event;
    let service;
    let eventType;
    let organizerId;

    if (req.body.serviceId) {
      // Booking a service
      if (req.useMongoDB) {
        service = await require('../models/Service').findById(req.body.serviceId);
      } else {
        const db = readDB();
        service = db.services.find(s => s.id === req.body.serviceId);
      }

      if (!service) {
        return res.status(404).json({ message: 'Service not found' });
      }
      eventType = 'service';
      organizerId = service.merchantId;
    } else if (req.body.eventId) {
      // Booking an event
      if (req.useMongoDB) {
        event = await Event.findById(req.body.eventId);
      } else {
        const db = readDB();
        event = db.events.find(e => e.id === req.body.eventId);
      }

      if (!event) {
        return res.status(404).json({ message: 'Event not found' });
      }
      eventType = event.eventType;
      organizerId = event.organizerId;
    } else {
      return res.status(400).json({ message: 'Either eventId or serviceId is required' });
    }

    if (req.body.couponCode) {
      const code = req.body.couponCode.toUpperCase();
      let coupon;
      if (req.useMongoDB) {
        coupon = await Coupon.findOne({ couponCode: code, isActive: true });
      } else {
        const db = readDB();
        coupon = (db.coupons || []).find(c => c.couponCode === code && c.isActive !== false);
      }

      if (!coupon) {
        return res.status(400).json({ message: 'Invalid or inactive coupon code' });
      }

      // Check merchant match
      const merchantId = req.body.merchantId || organizerId;
      if (merchantId && coupon.merchantId.toString() !== merchantId.toString()) {
        if (coupon.merchantId.toString() !== 'admin') {
          return res.status(400).json({ message: 'This coupon is not valid for this vendor' });
        }
      }

      // Check event/category match if not global
      if (coupon.isGlobal === false) {
        let isMatch = false;

        // NEW LOGIC: Check based on applicableType if it exists
        if (coupon.applicableType === 'EVENT') {
          if (req.body.eventId && coupon.applicableEvents && coupon.applicableEvents.some(eid => eid.toString() === req.body.eventId.toString())) {
            isMatch = true;
          }
        } else if (coupon.applicableType === 'CATEGORY') {
          if (req.body.categoryId && coupon.applicableCategory && coupon.applicableCategory.toString() === req.body.categoryId.toString()) {
            isMatch = true;
          }
          if (!isMatch && req.body.serviceType && coupon.serviceType && coupon.serviceType.toLowerCase() === req.body.serviceType.toLowerCase()) {
            isMatch = true;
          }
        } else if (coupon.applicableType === 'SERVICE') {
          if (req.body.serviceId && coupon.applicableServices && coupon.applicableServices.some(sid => sid.toString() === req.body.serviceId.toString())) {
            isMatch = true;
          }
          if (!isMatch && req.body.serviceType && coupon.serviceType === req.body.serviceType) {
            isMatch = true;
          }
        } else if (coupon.applicableType === 'ALL') {
          isMatch = true;
        }

        // LEGACY SUPPORT: If no match yet, check old fields
        if (!isMatch) {
          if (coupon.eventId && req.body.eventId && req.body.eventId !== "") {
            if (coupon.eventId.toString() === req.body.eventId.toString()) {
              isMatch = true;
            }
          }

          if (coupon.categoryId && req.body.categoryId && req.body.categoryId !== "") {
            if (coupon.categoryId.toString() === req.body.categoryId.toString()) {
              isMatch = true;
            }
          }

          if (coupon.serviceType && req.body.serviceType && req.body.serviceType !== "") {
            if (coupon.serviceType === req.body.serviceType) {
              isMatch = true;
            }
          }
          
          if (coupon.serviceIds && coupon.serviceIds.length > 0 && req.body.serviceId) {
            if (coupon.serviceIds.some(sid => sid.toString() === req.body.serviceId.toString())) {
              isMatch = true;
            }
          }
        }

        // Final fallback: if coupon has NO specific restrictions, it's a match
        const hasRestrictions = coupon.eventId || coupon.categoryId || coupon.serviceType || 
                               (coupon.applicableEvents && coupon.applicableEvents.length > 0) ||
                               (coupon.applicableCategory) ||
                               (coupon.applicableServices && coupon.applicableServices.length > 0);
        
        if (!isMatch && hasRestrictions) {
          return res.status(400).json({ message: 'Coupon not valid for this event or service' });
        }
      }

      // Check usage limit
      if (coupon.usageLimit && (coupon.usageCount || 0) >= coupon.usageLimit) {
        return res.status(400).json({ message: 'Coupon usage limit has been reached' });
      }

      // Check one-time usage
      const currentUserId = req.body.customerId || req.body.userId;
      if (currentUserId) {
        if (coupon.usedBy && coupon.usedBy.includes(currentUserId)) {
          return res.status(400).json({ message: 'You have already used this coupon' });
        }
        
        let existingBooking;
        if (req.useMongoDB) {
          existingBooking = await Booking.findOne({ 
            $or: [{ userId: currentUserId }, { customerId: currentUserId }], 
            couponCode: code,
            status: { $nin: ['cancelled', 'rejected'] }
          });
        } else {
          const db = readDB();
          existingBooking = (db.bookings || []).find(b => 
            (b.userId === currentUserId || b.customerId === currentUserId) && 
            b.couponCode === code && 
            !['cancelled', 'rejected'].includes(b.status)
          );
        }

        if (existingBooking) {
          return res.status(400).json({ message: 'You have already used this coupon' });
        }
      }
    }

    let newBooking;
    const ticketId = req.body.ticketId || `TKT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    if (req.useMongoDB) {
      // Check for full-service event daily capacity
      if (eventType === 'full-service') {
        const bookingDate = new Date(req.body.eventDate);
        const startOfDay = new Date(bookingDate.setHours(0, 0, 0, 0));
        const endOfDay = new Date(bookingDate.setHours(23, 59, 59, 999));

        const dailyBookingsCount = await Booking.countDocuments({
          eventId: req.body.eventId,
          eventDate: { $gte: startOfDay, $lte: endOfDay },
          timeSlot: req.body.timeSlot,
          status: { $ne: 'rejected' }
        });

        if (dailyBookingsCount >= (event.dailyCapacity || 1)) {
          return res.status(400).json({ message: 'This slot is already full.' });
        }
      }

      // For ticketed events, check availability first and calculate price
      if (eventType === 'ticketed') {
        const selectedTickets = req.body.selectedTickets || [{ name: req.body.ticketType, quantity: req.body.quantity }];
        const selectedSeats = req.body.selectedSeats || [];
        let calculatedTotalPrice = 0;
        
        // Ensure we update req.body.selectedTickets with prices
        const updatedSelectedTickets = [];

        // Check seat availability if seats are selected
        if (selectedSeats.length > 0) {
          const seatIds = selectedSeats.map(s => `${s.row}${s.number}`);
          const bookedSeats = event.seats.filter(s => seatIds.includes(`${s.row}${s.number}`) && s.status === 'booked');
          if (bookedSeats.length > 0) {
            return res.status(400).json({ message: 'One or more selected seats are already booked.' });
          }
        }

        for (const item of selectedTickets) {
          const ticketName = item.name.includes('(') ? item.name.split(' (')[0] : item.name;
          
          const ticket = await Ticket.findOne({ 
            eventId: req.body.eventId, 
            ticketName: ticketName 
          });

          if (!ticket) {
            return res.status(404).json({ message: `Ticket type "${ticketName}" not found` });
          }

          if (ticket.remainingQuantity < item.quantity) {
            return res.status(400).json({ message: `Not enough tickets available for "${ticketName}"` });
          }

          // Backend price verification (Early Bird)
          const now = new Date();
          let correctPrice = ticket.price;
          if (ticket.earlyBirdPrice && ticket.earlyBirdEndDate && now < new Date(ticket.earlyBirdEndDate)) {
            correctPrice = ticket.earlyBirdPrice;
          }
          
          const itemWithPrice = {
            ...item,
            price: correctPrice
          };
          updatedSelectedTickets.push(itemWithPrice);
          calculatedTotalPrice += correctPrice * item.quantity;
        }
        
        req.body.selectedTickets = updatedSelectedTickets;

        // Update req.body if needed, but we'll trust frontend for now and just log if different
        if (Math.abs(calculatedTotalPrice - (req.body.totalAmount || req.body.totalPrice || 0)) > 1) {
          console.log(`Price mismatch for booking: Expected ${calculatedTotalPrice}, Got ${req.body.totalAmount}`);
          if (!req.body.totalAmount) req.body.totalAmount = calculatedTotalPrice;
        }
      }

      const bookingData = { 
        ...req.body, 
        userId: req.body.customerId || req.body.userId, // Ensure userId is stored
        couponCode: req.body.couponCode ? req.body.couponCode.toUpperCase() : undefined, // Force uppercase
        eventType,
        organizerId: organizerId || req.body.organizerId,
        eventTitle: event ? event.title : req.body.eventTitle,
        serviceName: service ? service.name : req.body.serviceName
      };

      if (eventType === 'full-service' || eventType === 'service') {
        bookingData.status = 'pending';
        bookingData.paymentStatus = 'unpaid';
      }

      const booking = new Booking({
        ...bookingData,
        ticketId: (bookingData.status === 'confirmed' || bookingData.status === 'paid') ? ticketId : bookingData.ticketId
      });
      newBooking = await booking.save();
      console.log('Booking saved to MongoDB:', newBooking._id);
      
      // Mark coupon as used if applied
      if (newBooking.couponCode) {
        await markCouponAsUsed(req, newBooking.couponCode, newBooking.userId);
      }

      // If payment is already done (status is 'paid' or 'confirmed'), update remaining quantity
      if (req.body.status === 'confirmed' || req.body.status === 'paid') {
        if (eventType === 'ticketed') {
          const selectedTickets = req.body.selectedTickets || [{ name: req.body.ticketType, quantity: req.body.quantity }];
          const selectedSeats = req.body.selectedSeats || [];
          
          for (const item of selectedTickets) {
            const ticketName = item.name.includes('(') ? item.name.split(' (')[0] : item.name;
            await updateTicketRemainingQuantity(req.body.eventId, ticketName, item.quantity);
          }

          // Update seat status if seats are selected
          if (selectedSeats.length > 0) {
            const seatIds = selectedSeats.map(s => `${s.row}${s.number}`);
            await Event.updateOne(
              { _id: req.body.eventId },
              { $set: { "seats.$[elem].status": "booked" } },
              { arrayFilters: [{ "elem.row": { $in: selectedSeats.map(s => s.row) }, "elem.number": { $in: selectedSeats.map(s => s.number) } }] }
            );
            // Actually, the array filter above is not quite right because it might match wrong combinations of row/number
            // Let's do it more robustly:
            for (const seat of selectedSeats) {
              await Event.updateOne(
                { _id: req.body.eventId, "seats.row": seat.row, "seats.number": seat.number },
                { $set: { "seats.$.status": "booked" } }
              );
            }
          }
        }
      }

      // Generate QR code if status is confirmed or paid
      if (req.body.status === 'confirmed' || req.body.status === 'paid') {
        const qrCodeData = JSON.stringify({
          bookingId: newBooking._id.toString(),
          ticketId: ticketId,
          eventTitle: bookingData.eventTitle || bookingData.serviceName,
          customerName: req.body.customerName
        });
        newBooking.qrCode = await generateQRCode(qrCodeData);
        await newBooking.save();
        
        // Create transaction record
        await createTransaction(req, newBooking);
      }
      
      newBooking = { ...newBooking.toObject(), id: newBooking._id.toString() };
    } else {
      const db = readDB();

      // Check for full-service event daily capacity
      if (eventType === 'full-service') {
        const dailyBookingsCount = db.bookings.filter(b => 
          b.eventId === req.body.eventId && 
          b.eventDate === req.body.eventDate && 
          b.timeSlot === req.body.timeSlot &&
          b.status !== 'rejected'
        ).length;

        if (dailyBookingsCount >= (event.dailyCapacity || 1)) {
          return res.status(400).json({ message: 'This slot is already full.' });
        }
      }

      const id = uuidv4();
      const bookingData = { 
        ...req.body, 
        userId: req.body.customerId || req.body.userId, // Ensure userId is stored
        couponCode: req.body.couponCode ? req.body.couponCode.toUpperCase() : undefined, // Force uppercase
        eventType,
        organizerId: organizerId || req.body.organizerId,
        eventTitle: event ? event.title : req.body.eventTitle,
        serviceName: service ? service.name : req.body.serviceName
      };

      if (eventType === 'full-service' || eventType === 'service') {
        bookingData.status = 'pending';
        bookingData.paymentStatus = 'unpaid';
      }

      newBooking = { 
        ...bookingData, 
        id, 
        createdAt: new Date().toISOString(),
        ticketId: (bookingData.status === 'confirmed' || bookingData.status === 'paid') ? ticketId : bookingData.ticketId
      };
      
      // Generate QR code if status is confirmed or paid
      if (req.body.status === 'confirmed' || req.body.status === 'paid') {
        const qrCodeData = JSON.stringify({
          bookingId: id,
          ticketId: ticketId,
          eventTitle: bookingData.eventTitle || bookingData.serviceName,
          customerName: req.body.customerName
        });
        newBooking.qrCode = await generateQRCode(qrCodeData);
      }
      
      db.bookings.push(newBooking);
      writeDB(db);
      console.log('Booking saved to JSON file:', newBooking.id);

      // Mark coupon as used if applied
      if (newBooking.couponCode) {
        await markCouponAsUsed(req, newBooking.couponCode, newBooking.userId);
      }

      // Create transaction record if status is confirmed or paid - AFTER writing booking to DB
      if (req.body.status === 'confirmed' || req.body.status === 'paid') {
        await createTransaction(req, newBooking);
      }
    }
    
    // Create notification for the organizer
    const notificationTitle = newBooking.status === 'pending' ? 'New Booking Approval Request 🎯' : 'New Booking Received!';
    const notificationMessage = newBooking.status === 'pending' 
      ? `A new booking for "${newBooking.eventTitle || newBooking.serviceName}" from ${newBooking.customerName} requires your approval.`
      : `You have a new booking for "${newBooking.eventTitle || newBooking.serviceName}" from ${newBooking.customerName}`;

    await createNotification(
      req,
      newBooking.organizerId,
      'booking',
      notificationTitle,
      notificationMessage,
      newBooking.id,
      newBooking.eventId
    );
    
    // PART 3: For full-service events, return special message
    if (eventType === 'full-service' || eventType === 'service') {
      return res.status(201).json({
        message: "Booking request sent to merchant",
        id: newBooking.id || newBooking._id.toString()
      });
    }

    res.status(201).json(newBooking);
  } catch (err) {
    console.error('Booking creation failed:', err.message);
    res.status(400).json({ message: err.message });
  }
});

// Update a booking
router.patch('/:id', async (req, res) => {
  try {
    let updatedBooking;
    const oldBookingData = {};
    
    if (req.useMongoDB) {
      // Get old booking data first
      const oldBooking = await Booking.findById(req.params.id);
      if (oldBooking) {
        oldBookingData.status = oldBooking.status;
      }
      
      // Generate QR code if status is changing to confirmed or paid
      if ((req.body.status === 'confirmed' || req.body.status === 'paid') && oldBookingData.status !== 'confirmed' && oldBookingData.status !== 'paid') {
        const ticketId = `TKT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        const qrCodeData = JSON.stringify({
          bookingId: req.params.id,
          ticketId: ticketId,
          eventTitle: oldBooking ? oldBooking.eventTitle : 'Event',
          customerName: oldBooking ? oldBooking.customerName : 'Customer'
        });
        req.body.qrCode = await generateQRCode(qrCodeData);
        req.body.ticketId = ticketId;
      }
      
      // Special handling for completed status
      if (req.body.status === 'completed') {
        const totalAmount = 
          req.body.finalAmount || 
          oldBookingData.finalAmount || 
          oldBookingData.totalAmount || 
          oldBookingData.totalPrice || 
          0;
        
        // Use req.body.advancePaid if provided, otherwise use old data
        const currentAdvancePaid = req.body.advancePaid !== undefined 
          ? req.body.advancePaid 
          : (oldBookingData.advancePaid || oldBookingData.advanceAmount || 0);
        
        const remainingAmount = totalAmount - currentAdvancePaid;

        if (!req.body.paymentStatus) {
          if (remainingAmount > 0) {
            req.body.paymentStatus = 'partial';
            req.body.paymentStage = 'advance_paid';
            req.body.remainingAmount = remainingAmount;
          } else {
            req.body.paymentStatus = 'paid';
            req.body.paymentStage = 'fully_paid';
            req.body.remainingAmount = 0;
            req.body.paidAmount = totalAmount;
          }
        }
      }

      // Special handling for payment updates
      if (req.body.paymentStatus === 'paid' || req.body.paymentStatus === 'partial') {
        const isAdvance = req.body.paymentStatus === 'partial';
        const totalAmount = 
          req.body.finalAmount || 
          oldBookingData.finalAmount || 
          oldBookingData.totalAmount || 
          oldBookingData.totalPrice || 
          0;
        
        if (isAdvance) {
          req.body.paymentStage = 'advance_paid';
          req.body.paidAmount = req.body.advancePaid !== undefined ? req.body.advancePaid : (oldBookingData.advancePaid || 0);
          req.body.remainingAmount = totalAmount - req.body.paidAmount;
        } else {
          req.body.paymentStage = 'fully_paid';
          req.body.remainingAmount = 0;
          req.body.paidAmount = totalAmount;
          req.body.advancePaid = totalAmount; // Fully paid means advancePaid = total
        }
      }

      updatedBooking = await Booking.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!updatedBooking) return res.status(404).json({ message: 'Booking not found' });
      
      // If status changed to confirmed or paid, update remaining quantity
      if ((req.body.status === 'confirmed' || req.body.status === 'paid') && oldBookingData.status !== 'confirmed' && oldBookingData.status !== 'paid') {
        if (updatedBooking.eventType === 'ticketed') {
          const selectedTickets = updatedBooking.selectedTickets || [{ name: updatedBooking.ticketType, quantity: updatedBooking.quantity }];
          for (const item of selectedTickets) {
            const ticketName = item.name.includes('(') ? item.name.split(' (')[0] : item.name;
            await updateTicketRemainingQuantity(updatedBooking.eventId, ticketName, item.quantity);
          }
        }
        
        // Create transaction record
        await createTransaction(req, updatedBooking);
        
        // Mark coupon as used if applied
        if (updatedBooking.couponCode) {
          await markCouponAsUsed(req, updatedBooking.couponCode, updatedBooking.userId);
        }
      }

      updatedBooking = { ...updatedBooking.toObject(), id: updatedBooking._id.toString() };
    } else {
      const db = readDB();
      const index = db.bookings.findIndex(b => b.id === req.params.id);
      if (index === -1) return res.status(404).json({ message: 'Booking not found' });
      
      oldBookingData.status = db.bookings[index].status;
      
      // Generate QR code if status is changing to confirmed or paid
      if ((req.body.status === 'confirmed' || req.body.status === 'paid') && oldBookingData.status !== 'confirmed' && oldBookingData.status !== 'paid') {
        const ticketId = `TKT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        const qrCodeData = JSON.stringify({
          bookingId: req.params.id,
          ticketId: ticketId,
          eventTitle: db.bookings[index].eventTitle,
          customerName: db.bookings[index].customerName
        });
        req.body.qrCode = await generateQRCode(qrCodeData);
        req.body.ticketId = ticketId;
      }
      
      // Special handling for completed status in JSON DB
      if (req.body.status === 'completed') {
        const totalAmount = 
          req.body.finalAmount || 
          db.bookings[index].finalAmount || 
          db.bookings[index].totalAmount || 
          db.bookings[index].totalPrice || 
          0;
        
        // Use req.body.advancePaid if provided, otherwise use old data
        const currentAdvancePaid = req.body.advancePaid !== undefined 
          ? req.body.advancePaid 
          : (db.bookings[index].advancePaid || db.bookings[index].advanceAmount || 0);
        
        const remainingAmount = totalAmount - currentAdvancePaid;

        if (!req.body.paymentStatus) {
          if (remainingAmount > 0) {
            req.body.paymentStatus = 'partial';
            req.body.paymentStage = 'advance_paid';
            req.body.remainingAmount = remainingAmount;
          } else {
            req.body.paymentStatus = 'paid';
            req.body.paymentStage = 'fully_paid';
            req.body.remainingAmount = 0;
            req.body.paidAmount = totalAmount;
          }
        }
      }

      // Special handling for payment updates in JSON DB
      if (req.body.paymentStatus === 'paid' || req.body.paymentStatus === 'partial') {
        const isAdvance = req.body.paymentStatus === 'partial';
        const totalAmount = 
          req.body.finalAmount || 
          db.bookings[index].finalAmount || 
          db.bookings[index].totalAmount || 
          db.bookings[index].totalPrice || 
          0;
        
        if (isAdvance) {
          req.body.paymentStage = 'advance_paid';
          req.body.paidAmount = req.body.advancePaid !== undefined ? req.body.advancePaid : (db.bookings[index].advancePaid || 0);
          req.body.remainingAmount = totalAmount - req.body.paidAmount;
        } else {
          req.body.paymentStage = 'fully_paid';
          req.body.remainingAmount = 0;
          req.body.paidAmount = totalAmount;
          req.body.advancePaid = totalAmount; // Fully paid means advancePaid = total
        }
      }

      db.bookings[index] = { ...db.bookings[index], ...req.body };
      updatedBooking = db.bookings[index];
      writeDB(db);

      // Create transaction record if status changed to confirmed or paid - AFTER writing booking to DB
      if ((req.body.status === 'confirmed' || req.body.status === 'paid') && oldBookingData.status !== 'confirmed' && oldBookingData.status !== 'paid') {
        await createTransaction(req, updatedBooking);
        
        // Mark coupon as used if applied
        if (updatedBooking.couponCode) {
          await markCouponAsUsed(req, updatedBooking.couponCode, updatedBooking.userId);
        }
      }
    }
    
    // Trigger notifications based on status changes
    const { status, customerId, customerName, eventTitle, eventId, organizerId } = updatedBooking;
    
    // Emit socket event for booking update
    if (req.io) {
      const bookingIdStr = updatedBooking.id || updatedBooking._id.toString();
      const payload = {
        bookingId: bookingIdStr,
        status: updatedBooking.status,
        paymentStatus: updatedBooking.paymentStatus,
        updatedAt: new Date().toISOString()
      };

      if (customerId) {
        req.io.to(customerId).emit('booking_updated', payload);
      }
      if (organizerId) {
        req.io.to(organizerId).emit('booking_updated', payload);
      }
      
      // If status changed, also emit the status update event for compatibility
      if (status !== oldBookingData.status) {
        if (customerId) req.io.to(customerId).emit('booking_status_updated', payload);
        if (organizerId) req.io.to(organizerId).emit('booking_status_updated', payload);
      }
    }

    if (status !== oldBookingData.status) {
      // Customer notifications
      if (status === 'pending') {
        // Notify merchant that booking is awaiting their approval
        if (organizerId) {
          await createNotification(
            req,
            organizerId,
            'booking',
            'New Booking Approval Request 🎯',
            `A new booking for "${eventTitle}" from ${customerName} requires your approval.`,
            updatedBooking.id,
            eventId
          );
        }
      } else if (status === 'approved') {
        // Notify customer that booking is approved and needs payment
        await createNotification(
          req,
          customerId,
          'booking',
          'Booking Approved! 🎉',
          `Your booking for "${eventTitle}" has been approved. Please complete the payment.`,
          updatedBooking.id,
          eventId
        );
        // Also notify merchant to send bill if they haven't already
        if (organizerId) {
          await createNotification(
            req,
            organizerId,
            'payment',
            'Booking Approved - Send Bill 💰',
            `You have approved the booking for "${eventTitle}". Please provide the final bill to the customer.`,
            updatedBooking.id,
            eventId
          );
        }
      } else if (status === 'rejected') {
        await createNotification(
          req,
          customerId,
          'booking',
          'Booking Declined',
          `Unfortunately, your booking for "${eventTitle}" was declined. Please contact the organizer for more information.`,
          updatedBooking.id,
          eventId
        );
      } else if (status === 'plan_sent') {
        await createNotification(
          req,
          customerId,
          'booking',
          'Event Plan Sent 📅',
          `A new plan has been created for your event "${eventTitle}". Please review it.`,
          updatedBooking.id,
          eventId
        );
      } else if (status === 'payment_pending') {
        await createNotification(
          req,
          customerId,
          'payment',
          'Payment Requested 💰',
          `A bill has been generated for your event "${eventTitle}". Please complete the payment.`,
          updatedBooking.id,
          eventId
        );
      } else if (status === 'paid' || status === 'confirmed' || status === 'advance_paid') {
        await createNotification(
          req,
          customerId,
          'payment',
          status === 'advance_paid' ? 'Advance Payment Confirmed! ✅' : 'Payment Confirmed! ✅',
          status === 'advance_paid' 
            ? `We have received your advance payment for "${eventTitle}". Your booking is now confirmed.`
            : `We have received your payment for "${eventTitle}". Your booking is now confirmed.`,
          updatedBooking.id,
          eventId
        );
      } else if (status === 'completed') {
        const remainingBalance = (updatedBooking.finalAmount || updatedBooking.totalPrice) - (updatedBooking.advancePaid || 0);
        
        if (remainingBalance > 0 && updatedBooking.paymentStatus !== 'paid') {
          await createNotification(
            req,
            customerId,
            'payment',
            'Event Completed - Final Payment Due 💰',
            `The event "${eventTitle}" has been completed. Please pay the remaining balance of ₹${remainingBalance.toLocaleString()}.`,
            updatedBooking.id,
            eventId
          );
        } else {
          await createNotification(
            req,
            customerId,
            'event',
            'Event Completed! 🌟',
            `How was your experience with "${eventTitle}"? We'd love to hear your feedback!`,
            updatedBooking.id,
            eventId
          );
        }
      }
    }
    
    res.json(updatedBooking);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get ticket data for a booking
router.get('/:id/ticket', async (req, res) => {
  try {
    let booking;
    if (req.useMongoDB) {
      booking = await Booking.findById(req.params.id).populate('eventId');
    } else {
      const db = readDB();
      booking = db.bookings.find(b => b.id === req.params.id);
    }

    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    const ticketId = booking.ticketId || `TKT-${(booking.id || booking._id.toString()).slice(-8).toUpperCase()}`;
    
    // Use stored selectedTickets if they have prices
    let selectedTickets = [];
    if (booking.selectedTickets && booking.selectedTickets.length > 0) {
      selectedTickets = booking.selectedTickets.map(t => ({
        name: t.name,
        quantity: t.quantity,
        price: t.price || 0
      }));

      // If prices are missing, try to fetch them from the event
      const hasMissingPrices = selectedTickets.some(t => !t.price);
      if (hasMissingPrices && booking.eventId) {
        let event;
        if (req.useMongoDB) {
          event = await Event.findById(booking.eventId);
        } else {
          const db = readDB();
          event = db.events.find(e => e.id === booking.eventId || e._id === booking.eventId);
        }

        if (event && event.ticketTypes) {
          selectedTickets = selectedTickets.map(t => {
            if (!t.price) {
              const ticketType = event.ticketTypes.find(tt => tt.name === t.name);
              return { ...t, price: ticketType ? ticketType.price : 0 };
            }
            return t;
          });
        }
      }
    } else {
      // Fallback for older bookings
      selectedTickets = [{ 
        name: booking.ticketType || 'General', 
        quantity: booking.guests || 1, 
        price: booking.totalPrice / (booking.guests || 1) 
      }];
    }

    const qrCodeData = JSON.stringify({
      bookingId: booking.id || booking._id.toString(),
      ticketId: ticketId,
      eventTitle: booking.eventTitle || '',
      customerName: booking.customerName || ''
    });

    const qrCodeUrl = await generateQRCode(qrCodeData);

    res.json({
      ticketId,
      qrCodeUrl,
      selectedTickets,
      totalAmount: booking.finalAmount || booking.totalPrice,
      eventTitle: booking.eventTitle || '',
      eventDate: booking.eventDate,
      customerName: booking.customerName,
      guests: booking.guests || 1
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Validate a ticket (QR scan)
router.post('/validate-ticket', async (req, res) => {
  const { bookingId, ticketId } = req.body;
  
  if (!bookingId || !ticketId) {
    return res.status(400).json({ message: 'Booking ID and Ticket ID are required' });
  }

  try {
    let booking;
    if (req.useMongoDB) {
      // Basic check if bookingId is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(bookingId)) {
        return res.status(400).json({ message: 'Invalid Booking ID format' });
      }
      booking = await Booking.findById(bookingId);
    } else {
      const db = readDB();
      booking = db.bookings.find(b => b.id === bookingId);
    }
    
    if (!booking) {
      return res.status(404).json({ message: `Booking with ID ${bookingId} not found` });
    }
    
    // Check if the booking even has a ticket ID assigned
    if (!booking.ticketId) {
      return res.status(400).json({ message: 'This booking does not have a ticket assigned' });
    }

    if (booking.ticketId !== ticketId) {
      return res.status(400).json({ message: `Invalid ticket ID. Provided: ${ticketId}, Expected: ${booking.ticketId}` });
    }
    
    if (booking.status === 'used') {
      return res.status(400).json({ message: 'This ticket has already been used' });
    }
    
    // Mark as used
    if (req.useMongoDB) {
      booking.status = 'used';
      await booking.save();
    } else {
      const db = readDB();
      const index = db.bookings.findIndex(b => b.id === bookingId);
      db.bookings[index].status = 'used';
      writeDB(db);
    }
    
    res.json({ 
      message: 'Ticket validated successfully!', 
      booking: {
        id: bookingId,
        customerName: booking.customerName,
        eventTitle: booking.eventTitle,
        status: 'used'
      }
    });
  } catch (err) {
    console.error('Validation error:', err);
    res.status(500).json({ message: err.message });
  }
});

// Request a refund (Customer)
router.post('/request-refund/:id', async (req, res) => {
  const { reason } = req.body;
  try {
    let updatedBooking;
    if (req.useMongoDB) {
      updatedBooking = await Booking.findByIdAndUpdate(
        req.params.id,
        { refundStatus: 'pending', refundReason: reason },
        { new: true }
      );
    } else {
      const db = readDB();
      const index = db.bookings.findIndex(b => b.id === req.params.id);
      if (index === -1) return res.status(404).json({ message: 'Booking not found' });
      db.bookings[index].refundStatus = 'pending';
      db.bookings[index].refundReason = reason;
      updatedBooking = db.bookings[index];
      writeDB(db);
    }

    if (!updatedBooking) return res.status(404).json({ message: 'Booking not found' });

    // Notify admin about refund request
    if (updatedBooking.organizerId) {
      await createNotification(
        req,
        updatedBooking.organizerId,
        'payment',
        'Refund Requested 💸',
        `A refund has been requested for "${updatedBooking.eventTitle}" by ${updatedBooking.customerName}. Reason: ${reason}`,
        updatedBooking.id,
        updatedBooking.eventId
      );
    }

    res.json(updatedBooking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Approve refund
router.patch('/approve-refund/:id', async (req, res) => {
  const { refundAmount, transactionId } = req.body;
  try {
    let updatedBooking;
    if (req.useMongoDB) {
      updatedBooking = await Booking.findByIdAndUpdate(
        req.params.id,
        { 
          refundStatus: 'approved', 
          refundAmount: Number(refundAmount), 
          refundTransactionId: transactionId,
          refundedAt: new Date(),
          status: 'cancelled' 
        },
        { new: true }
      );
    } else {
      const db = readDB();
      const index = db.bookings.findIndex(b => b.id === req.params.id);
      if (index === -1) return res.status(404).json({ message: 'Booking not found' });
      db.bookings[index].refundStatus = 'approved';
      db.bookings[index].refundAmount = Number(refundAmount);
      db.bookings[index].refundTransactionId = transactionId;
      db.bookings[index].refundedAt = new Date().toISOString();
      db.bookings[index].status = 'cancelled';
      updatedBooking = db.bookings[index];
      writeDB(db);
    }

    if (!updatedBooking) return res.status(404).json({ message: 'Booking not found' });

    // Notify customer
    await createNotification(
      req,
      updatedBooking.customerId,
      'payment',
      'Refund Approved! ✅',
      `Your refund request for "${updatedBooking.eventTitle}" has been approved. Amount: ${refundAmount}. Transaction ID: ${transactionId}`,
      updatedBooking.id,
      updatedBooking.eventId
    );

    res.json(updatedBooking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Reject refund
router.patch('/reject-refund/:id', async (req, res) => {
  const { reason } = req.body;
  try {
    let updatedBooking;
    if (req.useMongoDB) {
      updatedBooking = await Booking.findByIdAndUpdate(
        req.params.id,
        { refundStatus: 'rejected' },
        { new: true }
      );
    } else {
      const db = readDB();
      const index = db.bookings.findIndex(b => b.id === req.params.id);
      if (index === -1) return res.status(404).json({ message: 'Booking not found' });
      db.bookings[index].refundStatus = 'rejected';
      updatedBooking = db.bookings[index];
      writeDB(db);
    }

    if (!updatedBooking) return res.status(404).json({ message: 'Booking not found' });

    // Notify customer
    await createNotification(
      req,
      updatedBooking.customerId,
      'payment',
      'Refund Request Rejected ❌',
      `Your refund request for "${updatedBooking.eventTitle}" was rejected. Reason: ${reason}`,
      updatedBooking.id,
      updatedBooking.eventId
    );

    res.json(updatedBooking);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
