const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../db.json');

const readDB = () => {
  if (!fs.existsSync(DB_FILE)) return { events: [], bookings: [], users: [], reviews: [] };
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
};

const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');

// Get all reviews
router.get('/', async (req, res) => {
  try {
    if (req.useMongoDB) {
      const reviews = await Review.find({ isApproved: true })
        .sort({ createdAt: -1 })
        .limit(100);
      res.json(reviews);
    } else {
      const db = readDB();
      const reviews = (db.reviews || []).filter(r => r.isApproved);
      res.json(reviews);
    }
  } catch (error) {
    console.error('Error fetching all reviews:', error);
    res.status(500).json({ message: 'Server error fetching reviews' });
  }
});

// Get all reviews for an event
router.get('/event/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    
    if (req.useMongoDB) {
      const reviews = await Review.find({ eventId, isApproved: true })
        .sort({ createdAt: -1 })
        .limit(50);
      res.json(reviews);
    } else {
      const db = readDB();
      const eventReviews = db.reviews.filter(r => r.eventId === eventId && r.isApproved);
      res.json(eventReviews);
    }
  } catch (error) {
    console.error('Error fetching event reviews:', error);
    res.status(500).json({ message: 'Server error fetching reviews' });
  }
});

// Get all reviews by a customer
router.get('/customer/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;
    
    if (req.useMongoDB) {
      const reviews = await Review.find({ customerId })
        .sort({ createdAt: -1 });
      res.json(reviews);
    } else {
      const db = readDB();
      const customerReviews = db.reviews.filter(r => r.customerId === customerId);
      res.json(customerReviews);
    }
  } catch (error) {
    console.error('Error fetching customer reviews:', error);
    res.status(500).json({ message: 'Server error fetching reviews' });
  }
});

// Create a new review
router.post('/', async (req, res) => {
  try {
    const { bookingId, eventId, eventTitle, customerId, customerName, organizerId, rating, comment, ratings, photos } = req.body;
    
    if (!bookingId || (!eventId && !req.body.serviceId) || !rating) {
      return res.status(400).json({ message: 'Missing required fields: bookingId, eventId (or serviceId), and rating are required' });
    }
    
    const finalEventId = eventId || req.body.serviceId;
    const finalEventTitle = eventTitle || req.body.serviceName || 'Service/Event';
    const finalOrganizerId = organizerId || req.body.vendorId || 'unknown';

    if (req.useMongoDB) {
      const Review = require('../models/Review');
      const Booking = require('../models/Booking');

      const review = await Review.create({
        bookingId,
        eventId: finalEventId,
        eventTitle: finalEventTitle,
        customerId,
        customerName,
        organizerId: finalOrganizerId,
        rating,
        comment,
        ratings,
        photos,
      });

      // Update booking to mark as rated
      await Booking.findByIdAndUpdate(bookingId, {
        isRated: true,
        rating,
        review: comment,
        ratedAt: new Date()
      });

      res.status(201).json(review);
    } else {
      const db = readDB();
      const newReview = {
        id: uuidv4(),
        bookingId,
        eventId: finalEventId,
        eventTitle: finalEventTitle,
        customerId,
        customerName,
        organizerId: finalOrganizerId,
        rating,
        comment,
        ratings,
        photos,
        helpfulVotes: 0,
        isApproved: true,
        isFlagged: false,
        createdAt: new Date().toISOString(),
      };
      db.reviews.push(newReview);

      // Update booking in JSON DB
      const bookingIndex = db.bookings.findIndex(b => (b.id === bookingId || b._id === bookingId));
      if (bookingIndex !== -1) {
        db.bookings[bookingIndex].isRated = true;
        db.bookings[bookingIndex].rating = rating;
        db.bookings[bookingIndex].review = comment;
        db.bookings[bookingIndex].ratedAt = new Date().toISOString();
      }

      writeDB(db);
      res.status(201).json(newReview);
    }
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ message: 'Server error creating review' });
  }
});

// Update a review (add organizer response)
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    if (req.useMongoDB) {
      const updatedReview = await Review.findByIdAndUpdate(id, updateData, { new: true });
      if (!updatedReview) {
        return res.status(404).json({ message: 'Review not found' });
      }
      res.json(updatedReview);
    } else {
      const db = readDB();
      const index = db.reviews.findIndex(r => r.id === id);
      if (index === -1) {
        return res.status(404).json({ message: 'Review not found' });
      }
      db.reviews[index] = { ...db.reviews[index], ...updateData };
      writeDB(db);
      res.json(db.reviews[index]);
    }
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ message: 'Server error updating review' });
  }
});

// Delete a review
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (req.useMongoDB) {
      const deletedReview = await Review.findByIdAndDelete(id);
      if (!deletedReview) {
        return res.status(404).json({ message: 'Review not found' });
      }
      res.json({ message: 'Review deleted successfully' });
    } else {
      const db = readDB();
      const index = db.reviews.findIndex(r => r.id === id);
      if (index === -1) {
        return res.status(404).json({ message: 'Review not found' });
      }
      db.reviews.splice(index, 1);
      writeDB(db);
      res.json({ message: 'Review deleted successfully' });
    }
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ message: 'Server error deleting review' });
  }
});

// Mark review as helpful
router.post('/:id/helpful', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (req.useMongoDB) {
      const updatedReview = await Review.findByIdAndUpdate(
        id,
        { $inc: { helpfulVotes: 1 } },
        { new: true }
      );
      res.json(updatedReview);
    } else {
      const db = readDB();
      const index = db.reviews.findIndex(r => r.id === id);
      if (index === -1) {
        return res.status(404).json({ message: 'Review not found' });
      }
      db.reviews[index].helpfulVotes += 1;
      writeDB(db);
      res.json(db.reviews[index]);
    }
  } catch (error) {
    console.error('Error marking review as helpful:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
