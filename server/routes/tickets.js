const express = require('express');
const router = express.Router();
const Ticket = require('../models/IssuedTicket');
const Event = require('../models/Event');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DB_FILE = path.join(__dirname, '../db.json');

const readDB = () => {
  if (!fs.existsSync(DB_FILE)) return { events: [], bookings: [], users: [], tickets: [] };
  const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  if (!data.tickets) data.tickets = [];
  return data;
};

const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');

// Create a new ticket (issued after booking)
router.post('/', async (req, res) => {
  try {
    const { eventId, bookingId, userId, ticketName, price, quantity, ticketId } = req.body;
    const finalTicketId = ticketId || `TKT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const qrCode = `QR-${eventId}-${bookingId}-${Date.now()}`;
    
    if (req.useMongoDB) {
      const newTicket = new Ticket({
        eventId,
        bookingId,
        userId,
        ticketId: finalTicketId,
        ticketName,
        price,
        quantity,
        qrCode
      });

      await newTicket.save();
      
      // Update soldCount in Event
      await Event.findByIdAndUpdate(eventId, {
        $inc: { "ticketTypes.$[elem].soldCount": quantity }
      }, {
        arrayFilters: [{ "elem.name": ticketName }]
      });

      res.status(201).json(newTicket);
    } else {
      const db = readDB();
      const newTicket = { 
        id: uuidv4(),
        eventId,
        bookingId,
        userId,
        ticketName,
        price,
        quantity,
        qrCode,
        createdAt: new Date().toISOString()
      };
      
      db.tickets.push(newTicket);
      
      // Update soldCount in Event
      const eventIndex = db.events.findIndex(e => e.id === eventId || e._id === eventId);
      if (eventIndex !== -1) {
        if (!db.events[eventIndex].ticketTypes) db.events[eventIndex].ticketTypes = [];
        const ticketTypeIndex = db.events[eventIndex].ticketTypes.findIndex(t => t.name === ticketName);
        if (ticketTypeIndex !== -1) {
          db.events[eventIndex].ticketTypes[ticketTypeIndex].soldCount = (db.events[eventIndex].ticketTypes[ticketTypeIndex].soldCount || 0) + quantity;
        }
      }
      
      writeDB(db);
      res.status(201).json(newTicket);
    }
  } catch (err) {
    console.error('Error creating ticket:', err);
    res.status(500).json({ message: 'Error creating ticket', error: err.message });
  }
});

// Get tickets for a user
router.get('/user/:userId', async (req, res) => {
  try {
    if (req.useMongoDB) {
      const tickets = await Ticket.find({ userId: req.params.userId }).populate('eventId');
      res.json(tickets);
    } else {
      const db = readDB();
      const tickets = db.tickets.filter(t => t.userId === req.params.userId);
      // Map event details
      const mappedTickets = tickets.map(t => ({
        ...t,
        eventId: db.events.find(e => e.id === t.eventId || e._id === t.eventId)
      }));
      res.json(mappedTickets);
    }
  } catch (err) {
    res.status(500).json({ message: 'Error fetching tickets', error: err.message });
  }
});

module.exports = router;
