const express = require('express');
const router = express.Router();
const Category = require('../models/Category');

// GET all service types (stored as categories with isGlobal: true)
router.get('/', async (req, res) => {
  try {
    const merchantId = req.user?.id || req.user?._id;
    
    if (!merchantId) {
      return res.status(401).json({ message: "Unauthorized: Authentication required" });
    }
    
    // Get both global service types and this merchant's service types
    const serviceTypes = await Category.find({ 
      isGlobal: true,
      $or: [
        { merchantId: merchantId },
        { merchantId: { $exists: false } },
        { merchantId: null }
      ]
    }).sort({ createdAt: -1 });
    
    res.json(serviceTypes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST create a new service type
router.post('/', async (req, res) => {
  let { name, description } = req.body;
  
  if (!name) {
    return res.status(400).json({ message: 'Name is required' });
  }

  const merchantId = req.user?.id || req.user?._id;
  
  if (!merchantId) {
    return res.status(401).json({ message: "Unauthorized: Authentication required" });
  }

  try {
    // Check for duplicate service type WITHIN SAME MERCHANT ONLY (Case-insensitive)
    const existing = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      merchantId: merchantId,
      isGlobal: true
    });

    if (existing) {
      return res.status(400).json({ message: 'Service type already exists for your account' });
    }

    const serviceType = new Category({
      name,
      description,
      merchantId: merchantId,
      isGlobal: true
    });

    const savedServiceType = await serviceType.save();
    res.status(201).json(savedServiceType);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Service type already exists for your account' });
    }
    res.status(400).json({ message: error.message });
  }
});

// DELETE a service type
router.delete('/:id', async (req, res) => {
  try {
    const merchantId = req.user?.id || req.user?._id;
    
    if (!merchantId) {
      return res.status(401).json({ message: "Unauthorized: Authentication required" });
    }
    
    const serviceType = await Category.findById(req.params.id);
    if (!serviceType) return res.status(404).json({ message: 'Service type not found' });

    if (serviceType.merchantId !== merchantId) {
      return res.status(403).json({ message: 'Not authorized to delete this service type' });
    }

    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Service type deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
