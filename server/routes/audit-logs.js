const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');

// GET all audit logs (Admin only)
router.get('/', async (req, res) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;