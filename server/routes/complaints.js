const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DB_FILE = path.join(__dirname, '../db.json');

const readDB = () => {
  if (!fs.existsSync(DB_FILE)) return { complaints: [] };
  const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  if (!data.complaints) data.complaints = [];
  return data;
};

const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');

// Get all complaints (Admin only)
router.get('/', async (req, res) => {
  try {
    if (req.useMongoDB) {
      const complaints = await Complaint.find().sort({ createdAt: -1 });
      res.json(complaints);
    } else {
      const db = readDB();
      res.json(db.complaints || []);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get complaints for a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    if (req.useMongoDB) {
      const complaints = await Complaint.find({ userId: req.params.userId }).sort({ createdAt: -1 });
      res.json(complaints);
    } else {
      const db = readDB();
      const complaints = (db.complaints || []).filter(c => c.userId === req.params.userId);
      res.json(complaints);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a complaint
router.post('/', async (req, res) => {
  try {
    if (req.useMongoDB) {
      const complaint = new Complaint(req.body);
      const newComplaint = await complaint.save();
      res.status(201).json(newComplaint);
    } else {
      const db = readDB();
      const newComplaint = {
        ...req.body,
        id: uuidv4(),
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      if (!db.complaints) db.complaints = [];
      db.complaints.push(newComplaint);
      writeDB(db);
      res.status(201).json(newComplaint);
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update a complaint status (Admin only)
router.patch('/:id', async (req, res) => {
  try {
    if (req.useMongoDB) {
      const updatedComplaint = await Complaint.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!updatedComplaint) return res.status(404).json({ message: 'Complaint not found' });
      res.json(updatedComplaint);
    } else {
      const db = readDB();
      const index = db.complaints.findIndex(c => c.id === req.params.id);
      if (index === -1) return res.status(404).json({ message: 'Complaint not found' });
      
      db.complaints[index] = { ...db.complaints[index], ...req.body };
      if (req.body.status === 'resolved') {
        db.complaints[index].resolvedAt = new Date().toISOString();
      }
      writeDB(db);
      res.json(db.complaints[index]);
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;