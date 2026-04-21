const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Ticket = require('../models/Ticket');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DB_FILE = path.join(__dirname, '../db.json');

const readDB = () => {
  if (!fs.existsSync(DB_FILE)) return { events: [], bookings: [], users: [] };
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
};

const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');

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

// Get recommended events
router.get('/recommendations/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    let recommendedEvents = [];

    if (req.useMongoDB) {
      const User = require('../models/User');
      const user = await User.findById(userId);
      
      if (!user || !user.interests || user.interests.length === 0) {
        // Return latest events if no interests
        recommendedEvents = await Event.find({ status: 'upcoming' }).sort({ createdAt: -1 }).limit(6);
      } else {
        // Filter by interests
        const Category = require('../models/Category');
        const categories = await Category.find({ name: { $in: user.interests } });
        const categoryIds = categories.map(c => c._id);
        
        recommendedEvents = await Event.find({ 
          categoryId: { $in: categoryIds },
          status: 'upcoming'
        }).limit(6);
        
        // If not enough recommended, fill with latest
        if (recommendedEvents.length < 3) {
          const latest = await Event.find({ 
            _id: { $nin: recommendedEvents.map(e => e._id) },
            status: 'upcoming'
          }).sort({ createdAt: -1 }).limit(6 - recommendedEvents.length);
          recommendedEvents = [...recommendedEvents, ...latest];
        }
      }
    } else {
      const db = readDB();
      const user = db.users.find(u => u.id === userId || u._id === userId);
      
      if (!user || !user.interests || user.interests.length === 0) {
        recommendedEvents = db.events.filter(e => e.status === 'upcoming').slice(0, 6);
      } else {
        const categories = db.categories.filter(c => user.interests.includes(c.name));
        const categoryIds = categories.map(c => c.id || c._id);
        
        recommendedEvents = db.events.filter(e => 
          categoryIds.includes(e.categoryId) && e.status === 'upcoming'
        ).slice(0, 6);
        
        if (recommendedEvents.length < 3) {
          const latest = db.events.filter(e => 
            !recommendedEvents.map(re => re.id).includes(e.id) && e.status === 'upcoming'
          ).slice(0, 6 - recommendedEvents.length);
          recommendedEvents = [...recommendedEvents, ...latest];
        }
      }
    }
    
    res.json(recommendedEvents);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all events
router.get('/', async (req, res) => {
  try {
    const { search, location, merchantId } = req.query;
    
    if (req.useMongoDB) {
      let query = {};
      
      // Filter by merchantId if provided (for organizer dashboard)
      if (merchantId && merchantId !== '' && merchantId !== 'null') {
        query.organizerId = merchantId;
      }
      
      if (search && location) {
        const searchRegex = new RegExp(search, 'i');
        const locationRegex = new RegExp(location, 'i');
        query = {
          $and: [
            {
              $or: [
                { title: { $regex: searchRegex } },
                { description: { $regex: searchRegex } }
              ]
            },
            { location: { $regex: locationRegex } }
          ]
        };
      } else if (search) {
        const searchRegex = new RegExp(search, 'i');
        query = {
          $or: [
            { title: { $regex: searchRegex } },
            { description: { $regex: searchRegex } }
          ]
        };
      } else if (location) {
        const locationRegex = new RegExp(location, 'i');
        query = { location: { $regex: locationRegex } };
      }

      let events = await Event.find(query).populate('categoryId').sort({ createdAt: -1 });
      
      // If search is provided, we also need to check category names
      if (search && events.length > 0) {
        const searchLower = search.toLowerCase();
        events = events.filter(e => {
          const titleMatch = e.title && e.title.toLowerCase().includes(searchLower);
          const descMatch = e.description && e.description.toLowerCase().includes(searchLower);
          const categoryMatch = e.categoryId && e.categoryId.name && e.categoryId.name.toLowerCase().includes(searchLower);
          return titleMatch || descMatch || categoryMatch;
        });
      }

      // Map to include 'category' name and 'ticketTypes' for frontend compatibility
      const mappedEvents = await Promise.all(events.map(async (e) => {
        const obj = e.toObject();
        obj.category = obj.categoryId ? obj.categoryId.name : 'Uncategorized';
        obj.category_id = obj.categoryId ? (obj.categoryId._id || obj.categoryId) : null;
        
        // Fetch ticket types for each event
        const tickets = await Ticket.find({ eventId: e._id });
        obj.ticketTypes = tickets.map(t => ({
          name: t.ticketName,
          price: t.price,
          quantity: t.totalQuantity,
          remainingQuantity: t.remainingQuantity,
          earlyBirdPrice: t.earlyBirdPrice,
          earlyBirdEndDate: t.earlyBirdEndDate,
          id: t._id
        }));
        
        return obj;
      }));
      res.json(mappedEvents);
    } else {
      const db = readDB();
      let events = db.events || [];
      
      // Filter by merchantId if provided (for organizer dashboard)
      if (merchantId && merchantId !== '' && merchantId !== 'null') {
        events = events.filter(e => e.organizerId === merchantId);
      }
      
      if (search && location) {
        const searchLower = search.toLowerCase();
        const locationLower = location.toLowerCase();
        events = events.filter(e => 
          ((e.title && e.title.toLowerCase().includes(searchLower)) ||
          (e.description && e.description.toLowerCase().includes(searchLower)) ||
          (e.category && e.category.toLowerCase().includes(searchLower))) &&
          (e.location && e.location.toLowerCase().includes(locationLower))
        );
      } else if (search) {
        const searchLower = search.toLowerCase();
        events = events.filter(e => 
          (e.title && e.title.toLowerCase().includes(searchLower)) ||
          (e.description && e.description.toLowerCase().includes(searchLower)) ||
          (e.category && e.category.toLowerCase().includes(searchLower))
        );
      } else if (location) {
        const locationLower = location.toLowerCase();
        events = events.filter(e => 
          e.location && e.location.toLowerCase().includes(locationLower)
        );
      }
      
      res.json(events);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new event
router.post('/', async (req, res) => {
  try {
    // Basic RBAC check: only organizers (merchants) and admins can create events
    const userRole = req.headers['x-user-role']; 
    if (userRole !== 'organizer' && userRole !== 'admin') {
      return res.status(403).json({ message: 'Only merchants can create events' });
    }

    // Validate required fields
    const { title, description, categoryId, price, location, eventDate, capacity, organizerId, organizerName, eventType } = req.body;
    
    // For ticketed events, eventDate is required. For full-service, it can be optional (or default to current time)
    const isTicketed = eventType === 'ticketed';
    const hasEventDate = !!eventDate;

    if (!title || !description || !categoryId || price === undefined || !location || (isTicketed && !hasEventDate) || !capacity || !organizerId || !organizerName) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        required: ['title', 'description', 'categoryId', 'price', 'location', isTicketed ? 'eventDate' : '', 'capacity', 'organizerId', 'organizerName'].filter(Boolean)
      });
    }

    if (req.useMongoDB) {
      const eventData = { ...req.body };
      
      // If full-service and no eventDate, set it to a dummy far-future date or current date
       if (!isTicketed && !hasEventDate) {
         // Set to a date far in the future (e.g., 2099) to avoid auto-completion by date logic
         const futureDate = new Date();
         futureDate.setFullYear(futureDate.getFullYear() + 10); 
         eventData.eventDate = futureDate.toISOString(); 
       }
      const { ticketTypes, seatConfig } = eventData;
      delete eventData.ticketTypes;

      // Generate seats if ticketed event and seatConfig provided
      if (req.body.eventType === 'ticketed' && seatConfig && seatConfig.rows > 0 && seatConfig.seatsPerRow > 0) {
        const generatedSeats = [];
        const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        for (let i = 0; i < seatConfig.rows; i++) {
          const row = alphabet[i % 26];
          for (let j = 1; j <= seatConfig.seatsPerRow; j++) {
            generatedSeats.push({
              row: row,
              number: j,
              status: 'available'
            });
          }
        }
        eventData.seats = generatedSeats;
      }

      const event = new Event(eventData);
      const newEvent = await event.save();

      // Save ticket types if it's a ticketed event
      if (req.body.eventType === 'ticketed' && ticketTypes && Array.isArray(ticketTypes)) {
        const ticketDocs = ticketTypes.map(t => ({
          ticketName: t.name,
          eventId: newEvent._id,
          price: Number(t.price),
          earlyBirdPrice: t.earlyBirdPrice ? Number(t.earlyBirdPrice) : undefined,
          earlyBirdEndDate: t.earlyBirdEndDate,
          totalQuantity: Number(t.quantity),
          remainingQuantity: Number(t.quantity)
        }));
        await Ticket.insertMany(ticketDocs);
      }

      const populatedEvent = await Event.findById(newEvent._id).populate('categoryId');
      const obj = populatedEvent.toObject();
      obj.category = obj.categoryId ? obj.categoryId.name : 'Uncategorized';
      obj.category_id = obj.categoryId ? (obj.categoryId._id || obj.categoryId) : null;
      
      // Add ticketTypes to the response object for the frontend
      const tickets = await Ticket.find({ eventId: newEvent._id });
      obj.ticketTypes = tickets.map(t => ({
        name: t.ticketName,
        price: t.price,
        quantity: t.totalQuantity,
        remainingQuantity: t.remainingQuantity,
        earlyBirdPrice: t.earlyBirdPrice,
        earlyBirdEndDate: t.earlyBirdEndDate,
        id: t._id
      }));

      // Notify all users about new event
      const users = await User.find({ role: 'customer' });
      for (const user of users) {
        await createNotification(
          req, 
          user._id.toString(), 
          'event', 
          'New Event!', 
          `A new event "${obj.title}" has been created. Check it out!`, 
          null, 
          obj._id.toString()
        );
      }

      res.status(201).json(obj);
    } else {
      const db = readDB();
      const newEventData = { ...req.body };
      
      // If full-service and no eventDate, set it to a dummy far-future date or current date
       if (!isTicketed && !hasEventDate) {
         const futureDate = new Date();
         futureDate.setFullYear(futureDate.getFullYear() + 10); 
         newEventData.eventDate = futureDate.toISOString(); 
       }
       
       // For full-service events, set status to live by default
       if (!isTicketed) {
         newEventData.status = 'live';
       }
       
       const newEvent = { ...newEventData, id: uuidv4(), createdAt: new Date().toISOString() };
      db.events.push(newEvent);
      writeDB(db);

      // Notify all users about new event in JSON DB
      const customers = db.users.filter(u => u.role === 'customer');
      for (const user of customers) {
        await createNotification(
          req, 
          user.id || user._id, 
          'event', 
          'New Event!', 
          `A new event "${newEvent.title}" has been created. Check it out!`, 
          null, 
          newEvent.id || newEvent._id
        );
      }

      res.status(201).json(newEvent);
    }
  } catch (err) {
    console.error('Event creation error:', err);
    res.status(400).json({ message: err.message, details: err.errors ? Object.keys(err.errors).map(key => err.errors[key].message) : [] });
  }
});

// Get event by ID
router.get('/:id', async (req, res) => {
  try {
    if (req.useMongoDB) {
      const event = await Event.findById(req.params.id).populate('categoryId');
      if (!event) return res.status(404).json({ message: 'Event not found' });
      const obj = event.toObject();
      obj.category = obj.categoryId ? obj.categoryId.name : 'Uncategorized';
      obj.category_id = obj.categoryId ? (obj.categoryId._id || obj.categoryId) : null;
      
      // Fetch ticket types from separate collection
      const tickets = await Ticket.find({ eventId: event._id });
      obj.ticketTypes = tickets.map(t => ({
        name: t.ticketName,
        price: t.price,
        quantity: t.totalQuantity,
        remainingQuantity: t.remainingQuantity,
        earlyBirdPrice: t.earlyBirdPrice,
        earlyBirdEndDate: t.earlyBirdEndDate,
        id: t._id
      }));

      res.json(obj);

      // Emit socket event for real-time updates
      if (req.io) {
        req.io.emit('eventUpdated', { 
          eventId: req.params.id, 
          type: 'event_edited',
          message: 'Event details updated' 
        });
      }
    } else {
      const db = readDB();
      const event = db.events.find(e => e.id === req.params.id);
      if (!event) return res.status(404).json({ message: 'Event not found' });
      res.json(event);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get slot availability for a selected date
router.get('/:eventId/availability', async (req, res) => {
  try {
    const { eventId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: 'Date is required' });
    }

    if (req.useMongoDB) {
      const event = await Event.findById(eventId);
      if (!event) return res.status(404).json({ message: 'Event not found' });

      // Convert input date string to start and end of day in UTC/local as needed
      const bookingDate = new Date(date);
      const startOfDay = new Date(bookingDate.setHours(0, 0, 0, 0));
      const endOfDay = new Date(bookingDate.setHours(23, 59, 59, 999));

      const bookings = await Booking.find({
        eventId,
        eventDate: { $gte: startOfDay, $lte: endOfDay },
        status: { $ne: 'rejected' }
      });

      const dayBookings = bookings.filter(b => b.timeSlot === 'day').length;
      const nightBookings = bookings.filter(b => b.timeSlot === 'night').length;

      const availability = {
        Day: dayBookings >= (event.dailyCapacity || 1) ? 'Full' : 'Available',
        Night: nightBookings >= (event.dailyCapacity || 1) ? 'Full' : 'Available'
      };

      res.json(availability);
    } else {
      const db = readDB();
      const event = db.events.find(e => e.id === eventId);
      if (!event) return res.status(404).json({ message: 'Event not found' });

      const bookings = db.bookings.filter(b => 
        b.eventId === eventId && 
        b.eventDate.startsWith(date) && 
        b.status !== 'rejected'
      );

      const dayBookings = bookings.filter(b => b.timeSlot === 'day').length;
      const nightBookings = bookings.filter(b => b.timeSlot === 'night').length;

      const availability = {
        Day: dayBookings >= (event.dailyCapacity || 1) ? 'Full' : 'Available',
        Night: nightBookings >= (event.dailyCapacity || 1) ? 'Full' : 'Available'
      };

      res.json(availability);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update event
router.patch('/:id', async (req, res) => {
  try {
    if (req.useMongoDB) {
      const eventData = { ...req.body };
      const { ticketTypes } = eventData;
      delete eventData.ticketTypes;

      // Update event data
      const updatedEvent = await Event.findByIdAndUpdate(req.params.id, eventData, { new: true }).populate('categoryId');
      if (!updatedEvent) return res.status(404).json({ message: 'Event not found' });

      // REGENERATE SEATS if seatConfig changed
      const { seatConfig } = req.body;
      if (req.body.eventType === 'ticketed' && seatConfig && (seatConfig.rows > 0 || seatConfig.seatsPerRow > 0)) {
        // Only regenerate if rows or seatsPerRow changed
        const oldRows = updatedEvent.seatConfig?.rows || 0;
        const oldSeatsPerRow = updatedEvent.seatConfig?.seatsPerRow || 0;
        
        if (Number(seatConfig.rows) !== oldRows || Number(seatConfig.seatsPerRow) !== oldSeatsPerRow) {
          const generatedSeats = [];
          const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
          
          // Keep track of existing booked seats to preserve them if possible
          const existingBookedSeats = updatedEvent.seats.filter(s => s.status === 'booked');
          
          for (let i = 0; i < Number(seatConfig.rows); i++) {
            const row = alphabet[i % 26];
            for (let j = 1; j <= Number(seatConfig.seatsPerRow); j++) {
              // Check if this seat was previously booked
              const wasBooked = existingBookedSeats.find(s => s.row === row && s.number === j);
              generatedSeats.push({
                row: row,
                number: j,
                status: wasBooked ? 'booked' : 'available'
              });
            }
          }
          updatedEvent.seats = generatedSeats;
          updatedEvent.seatConfig = {
            rows: Number(seatConfig.rows),
            seatsPerRow: Number(seatConfig.seatsPerRow)
          };
          await updatedEvent.save();
        }
      }

      // Update ticket types if provided
      if (req.body.eventType === 'ticketed' && ticketTypes && Array.isArray(ticketTypes)) {
        // Simple approach: delete existing and insert new ones
        await Ticket.deleteMany({ eventId: updatedEvent._id });
        
        let totalRemaining = 0;
        let isSoldOut = true;
        
        const ticketDocs = ticketTypes.map(t => {
          const remaining = t.remainingQuantity !== undefined ? Number(t.remainingQuantity) : Number(t.quantity);
          totalRemaining += remaining;
          if (remaining > 0) isSoldOut = false;
          
          return {
            ticketName: t.name,
            eventId: updatedEvent._id,
            price: Number(t.price),
            earlyBirdPrice: t.earlyBirdPrice ? Number(t.earlyBirdPrice) : undefined,
            earlyBirdEndDate: t.earlyBirdEndDate,
            totalQuantity: Number(t.quantity),
            remainingQuantity: remaining
          };
        });
        await Ticket.insertMany(ticketDocs);

        // Update event status/isSoldOut based on tickets
        if (!isSoldOut) {
          updatedEvent.status = 'upcoming'; // Or keep current if not completed
          updatedEvent.isSoldOut = false;
        } else {
          updatedEvent.status = 'sold_out';
          updatedEvent.isSoldOut = true;
        }
        await updatedEvent.save();
      }

      const obj = updatedEvent.toObject();
      obj.category = obj.categoryId ? obj.categoryId.name : 'Uncategorized';
      
      // Fetch ticket types for the response
      const tickets = await Ticket.find({ eventId: updatedEvent._id });
      obj.ticketTypes = tickets.map(t => ({
        name: t.ticketName,
        price: t.price,
        quantity: t.totalQuantity,
        remainingQuantity: t.remainingQuantity,
        earlyBirdPrice: t.earlyBirdPrice,
        earlyBirdEndDate: t.earlyBirdEndDate,
        id: t._id
      }));

      res.json(obj);
    } else {
      const db = readDB();
      const index = db.events.findIndex(e => e.id === req.params.id);
      if (index === -1) return res.status(404).json({ message: 'Event not found' });
      db.events[index] = { ...db.events[index], ...req.body };
      writeDB(db);
      res.json(db.events[index]);

      // Emit socket event for real-time updates
      if (req.io) {
        req.io.emit('eventUpdated', { 
          eventId: req.params.id, 
          type: 'event_edited',
          message: 'Event details updated' 
        });
      }
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete event
router.delete('/:id', async (req, res) => {
  try {
    if (req.useMongoDB) {
      await Event.findByIdAndDelete(req.params.id);
      res.json({ message: 'Event deleted' });
    } else {
      const db = readDB();
      db.events = db.events.filter(e => e.id !== req.params.id);
      writeDB(db);
      res.json({ message: 'Event deleted' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update event statuses based on dates (can be called periodically)
router.post('/update-statuses', async (req, res) => {
  try {
    if (req.useMongoDB) {
      const now = new Date();
      const events = await Event.find({ status: { $in: ['upcoming', 'live'] } });
      
      let updatedCount = 0;
      for (const event of events) {
        const eventDate = new Date(event.eventDate);
        let needsUpdate = false;
        
        // Mark as completed if date has passed
        if (eventDate < now && event.status !== 'completed') {
          event.status = 'completed';
          needsUpdate = true;
        }
        
        // Mark as live if within 24 hours
        const hoursUntilEvent = (eventDate - now) / (1000 * 60 * 60);
        if (hoursUntilEvent >= 0 && hoursUntilEvent <= 24 && event.status === 'upcoming') {
          event.status = 'live';
          needsUpdate = true;
        }
        
        if (needsUpdate) {
          await event.save();
          updatedCount++;
        }
      }
      
      res.json({ message: `Updated ${updatedCount} event statuses` });
    } else {
      // For JSON file database
      const db = readDB();
      const now = new Date();
      let updatedCount = 0;
      
      db.events.forEach(event => {
        const eventDate = new Date(event.eventDate);
        
        if (eventDate < now && event.status !== 'completed' && event.status !== 'cancelled') {
          event.status = 'completed';
          updatedCount++;
        }
        
        const hoursUntilEvent = (eventDate - now) / (1000 * 60 * 60);
        if (hoursUntilEvent >= 0 && hoursUntilEvent <= 24 && event.status === 'upcoming') {
          event.status = 'live';
          updatedCount++;
        }
      });
      
      writeDB(db);
      res.json({ message: `Updated ${updatedCount} event statuses` });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add decoration theme to event
router.post('/:id/decoration-themes', async(req, res) => {
  try {
  const { name, image, description } = req.body;
    
  if (!name || !image || !description) {
      return res.status(400).json({ message: 'Missing required fields: name, image, description' });
    }
    
  if (req.useMongoDB) {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
      
      event.decorationThemes.push({ name, image, description });
      await event.save();
      res.json(event);
    } else {
    const db = readDB();
    const eventIndex = db.events.findIndex(e => e.id === req.params.id);
    if (eventIndex === -1) return res.status(404).json({ message: 'Event not found' });
      
    if (!db.events[eventIndex].decorationThemes) {
        db.events[eventIndex].decorationThemes = [];
      }
      
    const newTheme = {
        id: uuidv4(),
        name,
        image,
        description,
        createdAt: new Date().toISOString()
      };
      
      db.events[eventIndex].decorationThemes.push(newTheme);
      writeDB(db);
      res.json(db.events[eventIndex]);
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Remove decoration theme from event
router.delete('/:eventId/decoration-themes/:themeId', async (req, res) => {
  try {
  if (req.useMongoDB) {
    const event = await Event.findById(req.params.eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });
      
      event.decorationThemes = event.decorationThemes.filter(t => t._id.toString() !== req.params.themeId);
      await event.save();
      res.json(event);
    } else {
    const db = readDB();
    const eventIndex = db.events.findIndex(e => e.id === req.params.eventId);
    if (eventIndex === -1) return res.status(404).json({ message: 'Event not found' });
      
      db.events[eventIndex].decorationThemes = db.events[eventIndex].decorationThemes.filter(
        t => t.id !== req.params.themeId
      );
      writeDB(db);
      res.json(db.events[eventIndex]);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Merchant: Cancel an event
router.post('/cancel-event/:id', async (req, res) => {
  const { reason } = req.body;
  try {
    let event;
    if (req.useMongoDB) {
      event = await Event.findByIdAndUpdate(
        req.params.id,
        { status: 'cancelled', cancellationReason: reason },
        { new: true }
      );
    } else {
      const db = readDB();
      const index = db.events.findIndex(e => e.id === req.params.id);
      if (index === -1) return res.status(404).json({ message: 'Event not found' });
      db.events[index].status = 'cancelled';
      db.events[index].cancellationReason = reason;
      event = db.events[index];
      writeDB(db);
    }

    if (!event) return res.status(404).json({ message: 'Event not found' });

    // Mark all bookings as cancelled and request refund for paid ones
    let bookings;
    if (req.useMongoDB) {
      bookings = await Booking.find({ eventId: req.params.id, status: { $ne: 'cancelled' } });
      await Booking.updateMany(
        { eventId: req.params.id, status: { $ne: 'cancelled' } },
        { 
          status: 'cancelled', 
          refundStatus: 'pending',
          refundReason: `Event Cancelled: ${reason}`
        }
      );
    } else {
      const db = readDB();
      bookings = db.bookings.filter(b => b.eventId === req.params.id && b.status !== 'cancelled');
      db.bookings.forEach(b => {
        if (b.eventId === req.params.id && b.status !== 'cancelled') {
          b.status = 'cancelled';
          if (b.paymentStatus === 'paid') {
            b.refundStatus = 'pending';
            b.refundReason = `Event Cancelled: ${reason}`;
          }
        }
      });
      writeDB(db);
    }

    // Notify all customers
    for (const booking of bookings) {
      await createNotification(
        req,
        booking.customerId,
        'event',
        'Event Cancelled ❌',
        `The event "${event.title}" has been cancelled by the organizer. Reason: ${reason}. Your booking has been cancelled and a refund has been initiated if applicable.`,
        booking.id || booking._id.toString(),
        event.id || event._id.toString()
      );
    }

    // Emit socket event for real-time updates
    if (req.io) {
      req.io.emit('eventUpdated', { 
        eventId: req.params.id, 
        type: 'event_cancelled',
        message: 'Event has been cancelled' 
      });
    }

    res.json(event);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Merchant: Get attendee list for an event
router.get('/:id/attendees', async (req, res) => {
  try {
    let bookings;
    if (req.useMongoDB) {
      bookings = await Booking.find({ eventId: req.params.id, status: { $in: ['confirmed', 'paid', 'used'] } });
    } else {
      const db = readDB();
      bookings = (db.bookings || []).filter(b => b.eventId === req.params.id && ['confirmed', 'paid', 'used'].includes(b.status));
    }
    
    const attendees = bookings.map(b => ({
      bookingId: b.id || b._id.toString(),
      customerName: b.customerName,
      customerEmail: b.customerEmail,
      ticketType: b.ticketType,
      quantity: b.quantity,
      status: b.status,
      bookedAt: b.createdAt
    }));
    
    res.json(attendees);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Merchant: Notify all attendees of an event
router.post('/:id/notify-attendees', async (req, res) => {
  const { title, message } = req.body;
  
  if (!title || !message) {
    return res.status(400).json({ message: 'Title and message are required' });
  }

  try {
    let bookings;
    if (req.useMongoDB) {
      bookings = await Booking.find({ eventId: req.params.id, status: { $in: ['confirmed', 'paid', 'used'] } });
    } else {
      const db = readDB();
      bookings = (db.bookings || []).filter(b => b.eventId === req.params.id && ['confirmed', 'paid', 'used'].includes(b.status));
    }
    
    const eventId = req.params.id;
    
    // Notify all unique customers
    const customerIds = [...new Set(bookings.map(b => b.customerId))];
    
    for (const customerId of customerIds) {
      await createNotification(
        req,
        customerId,
        'event',
        title,
        message,
        undefined, // No specific booking ID
        eventId
      );
    }
    
    res.json({ message: `Notification sent to ${customerIds.length} attendees` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin/System: Send event reminders (scheduled task simulation)
router.post('/send-reminders', async (req, res) => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startOfTomorrow = new Date(tomorrow.setHours(0, 0, 0, 0));
    const endOfTomorrow = new Date(tomorrow.setHours(23, 59, 59, 999));

    let bookings;
    if (req.useMongoDB) {
      bookings = await Booking.find({
        eventDate: { $gte: startOfTomorrow, $lte: endOfTomorrow },
        status: { $in: ['confirmed', 'paid'] },
        reminderSent: { $ne: true }
      });
    } else {
      const db = readDB();
      bookings = (db.bookings || []).filter(b => {
        const d = new Date(b.eventDate);
        return d >= startOfTomorrow && d <= endOfTomorrow && 
               ['confirmed', 'paid'].includes(b.status) && 
               !b.reminderSent;
      });
    }

    let count = 0;
    for (const booking of bookings) {
      await createNotification(
        req,
        booking.customerId,
        'event',
        'Upcoming Event Reminder! 🔔',
        `Don't forget! Your event "${booking.eventTitle}" is happening tomorrow. We look forward to seeing you!`,
        booking.id || booking._id.toString(),
        booking.eventId
      );
      
      // Mark reminder as sent
      if (req.useMongoDB) {
        await Booking.findByIdAndUpdate(booking._id, { reminderSent: true });
      } else {
        const db = readDB();
        const index = db.bookings.findIndex(b => b.id === booking.id);
        if (index !== -1) {
          db.bookings[index].reminderSent = true;
          writeDB(db);
        }
      }
      count++;
    }

    res.json({ message: `Sent ${count} reminders` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
