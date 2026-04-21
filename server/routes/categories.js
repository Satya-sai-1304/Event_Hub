const express = require('express');
const router = express.Router();
const Category = require('../models/Category');

// GET all categories - STRICT MERCHANT ISOLATION
router.get('/', async (req, res) => {
  try {
    // Use authenticated user's ID from session
    const merchantId = req.user?.id || req.user?._id;
    
    if (!merchantId) {
      return res.status(401).json({ message: "Unauthorized: Authentication required" });
    }
    
    // Get both global categories and this merchant's categories
    const categories = await Category.find({ 
      $or: [
        { isGlobal: false, merchantId: merchantId },
        { isGlobal: false, merchantId: { $exists: false } },
        { isGlobal: false, merchantId: null }
      ]
    }).sort({ createdAt: -1 });
    
    res.json(categories);
  } catch (err) {
    console.error('Error in GET /categories:', err);
    res.status(500).json({ message: err.message });
  }
});

// POST a new category or service type
router.post('/', async (req, res) => {
  const { name, description, isGlobal } = req.body;
  
  if (!name) {
    return res.status(400).json({ message: 'Name is required' });
  }

  // Use authenticated user's ID from session
  const merchantId = req.user?.id || req.user?._id;
  
  if (!merchantId) {
    return res.status(401).json({ message: "Unauthorized: Authentication required" });
  }

  try {
    // Check for duplicate category/service type WITHIN SAME MERCHANT ONLY (Case-insensitive)
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      merchantId: merchantId,
      isGlobal: !!isGlobal
    });

    if (existingCategory) {
      if (isGlobal) {
        return res.status(400).json({ message: 'Service type already exists for your account' });
      }
      return res.status(400).json({ message: 'Category already exists for your account' });
    }

    const category = new Category({
      name,
      description,
      merchantId: merchantId,
      isGlobal: !!isGlobal // true = service type, false = category
    });
    
    const newCategory = await category.save();
    res.status(201).json(newCategory);
  } catch (err) {
    console.error('Error saving category:', err);
    if (err.code === 11000) {
      // Duplicate key error - same name for same merchant
      if (isGlobal) {
        return res.status(400).json({ message: 'Service type already exists for your account' });
      }
      return res.status(400).json({ message: 'Category already exists for your account' });
    }
    res.status(400).json({ message: err.message });
  }
});

// PUT to update a category - WITH MERCHANT VALIDATION
router.put('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });

    // Use authenticated user's ID from session
    const merchantId = req.user?.id || req.user?._id;
    
    if (!merchantId) {
      return res.status(401).json({ message: "Unauthorized: Authentication required" });
    }

    // Verify merchant owns this category
    if (category.merchantId !== merchantId) {
      return res.status(403).json({ message: 'Unauthorized: You can only update your own categories' });
    }

    category.name = req.body.name || category.name;
    category.description = req.body.description || category.description;

    const updatedCategory = await category.save();
    res.json(updatedCategory);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE a category - WITH MERCHANT VALIDATION
router.delete('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    
    // Use authenticated user's ID from session
    const merchantId = req.user?.id || req.user?._id;
    
    if (!merchantId) {
      return res.status(401).json({ message: "Unauthorized: Authentication required" });
    }
    
    // Verify merchant owns this category
    if (category.merchantId !== merchantId) {
      return res.status(403).json({ message: 'Unauthorized: You can only delete your own categories' });
    }
    
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
