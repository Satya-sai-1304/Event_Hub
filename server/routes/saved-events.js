const express = require('express');
const router = express.Router();
const SavedEvent = require('../models/SavedEvent');

// Get all saved events for a customer
router.get('/', async (req, res) => {
  try {
    const { customerId } = req.query;
    
    if (!customerId) {
      return res.status(400).json({ message: 'Customer ID is required' });
    }
    
    const savedEvents = await SavedEvent.find({ customerId })
      .sort({ savedAt: -1 });
    
    res.json(savedEvents);
  } catch (error) {
    console.error('Error fetching saved events:', error);
    res.status(500).json({ message: 'Server error fetching saved events' });
  }
});

// Save an event
router.post('/', async (req, res) => {
  try {
    const { customerId, eventId, eventTitle, eventImage, eventPrice, eventDate, category } = req.body;
    
    if (!customerId || !eventId) {
      return res.status(400).json({ message: 'Customer ID and Event ID are required' });
    }
    
    // Check if already saved
    const existing = await SavedEvent.findOne({ customerId, eventId });
    if (existing) {
      return res.status(400).json({ message: 'Event already saved' });
    }
    
    const savedEvent = await SavedEvent.create({
      customerId,
      eventId,
      eventTitle,
      eventImage,
      eventPrice,
      eventDate,
      category
    });
    
    res.status(201).json(savedEvent);
  } catch (error) {
    console.error('Error saving event:', error);
    res.status(500).json({ message: 'Server error saving event' });
  }
});

// Remove a saved event
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const savedEvent = await SavedEvent.findByIdAndDelete(id);
    
    if (!savedEvent) {
      return res.status(404).json({ message: 'Saved event not found' });
    }
    
    res.json({ message: 'Saved event removed successfully' });
  } catch (error) {
    console.error('Error removing saved event:', error);
    res.status(500).json({ message: 'Server error removing saved event' });
  }
});

module.exports = router;
