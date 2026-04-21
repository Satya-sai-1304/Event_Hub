const express = require('express');
const router = express.Router();
const Decoration = require('../models/Decoration');

// Get all decorations
router.get('/', async (req, res) => {
  try {
   const decorations = await Decoration.find({ isActive: true }).sort({ createdAt: -1 });
    res.json(decorations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single decoration
router.get('/:id', async (req, res) => {
  try {
   const decoration = await Decoration.findById(req.params.id);
   if (!decoration) return res.status(404).json({ message: 'Decoration not found' });
    res.json(decoration);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create new decoration
router.post('/', async (req, res) => {
  try {
   const decoration = new Decoration({
      name: req.body.name,
      image: req.body.image,
     description: req.body.description,
      category: req.body.category || 'all',
      createdBy: 'admin'
    });
    
   const newDecoration = await decoration.save();
    res.status(201).json(newDecoration);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update decoration
router.put('/:id', async (req, res) => {
  try {
    const decoration = await Decoration.findByIdAndUpdate(
      req.params.id,
      {
        name: req.body.name,
        image: req.body.image,
        description: req.body.description,
        category: req.body.category,
        price: req.body.price,
      },
      { new: true }
    );
    
    if (!decoration) return res.status(404).json({ message: 'Decoration not found' });
    res.json(decoration);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete decoration (soft delete by setting isActive to false)
router.delete('/:id', async (req, res) => {
  try {
   const decoration = await Decoration.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
   if (!decoration) return res.status(404).json({ message: 'Decoration not found' });
    res.json({ message: 'Decoration deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
