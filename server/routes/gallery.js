const express = require('express');
const router = express.Router();
const GalleryPhoto = require('../models/GalleryPhoto');
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../db.json');

const readDB = () => {
  if (!fs.existsSync(DB_FILE)) return { events: [], bookings: [], users: [], services: [], gallery: [] };
  const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  if (!data.gallery) data.gallery = [];
  return data;
};

const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');

// Get all gallery photos
router.get('/', async (req, res) => {
  try {
    const { category, merchantId } = req.query;
    
    if (req.useMongoDB) {
      let query = {};
      if (category && category !== 'all') {
        query.category = category;
      }
      if (merchantId) {
        query.merchantId = merchantId;
      }
      
      const photos = await GalleryPhoto.find(query)
        .sort({ uploadedAt: -1 })
        .limit(100);
      
      res.json(photos);
    } else {
      const db = readDB();
      let photos = db.gallery || [];
      
      if (category && category !== 'all') {
        photos = photos.filter(p => p.category === category);
      }
      if (merchantId) {
        photos = photos.filter(p => p.merchantId === merchantId);
      }
      
      res.json(photos.reverse());
    }
  } catch (error) {
    console.error('Error fetching gallery photos:', error);
    res.status(500).json({ message: 'Server error fetching gallery photos' });
  }
});

// Upload a new photo
router.post('/', async (req, res) => {
  try {
    const { serviceId, serviceName, merchantId, merchantName, imageUrl, caption, category } = req.body;
    
    if (!merchantId || !imageUrl || !category) {
      return res.status(400).json({ message: 'Missing required fields (merchantId, imageUrl, category)' });
    }
    
    if (req.useMongoDB) {
      const photo = await GalleryPhoto.create({
        serviceId,
        serviceName,
        merchantId,
        merchantName,
        imageUrl,
        caption,
        category
      });
      res.status(201).json(photo);
    } else {
      const db = readDB();
      const newPhoto = {
        id: Date.now().toString(),
        serviceId,
        serviceName,
        merchantId,
        merchantName,
        imageUrl,
        caption,
        category,
        uploadedAt: new Date().toISOString()
      };
      db.gallery.push(newPhoto);
      writeDB(db);
      res.status(201).json(newPhoto);
    }
  } catch (error) {
    console.error('Error uploading photo:', error);
    res.status(500).json({ message: 'Server error uploading photo' });
  }
});

// Delete a photo
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (req.useMongoDB) {
      const photo = await GalleryPhoto.findByIdAndDelete(id);
      if (!photo) return res.status(404).json({ message: 'Photo not found' });
      res.json({ message: 'Photo deleted successfully' });
    } else {
      const db = readDB();
      const initialLength = db.gallery.length;
      db.gallery = db.gallery.filter(p => p.id !== id);
      
      if (db.gallery.length === initialLength) {
        return res.status(404).json({ message: 'Photo not found' });
      }
      
      writeDB(db);
      res.json({ message: 'Photo deleted successfully' });
    }
  } catch (error) {
    console.error('Error deleting photo:', error);
    res.status(500).json({ message: 'Server error deleting photo' });
  }
});

module.exports = router;