const express = require('express');
const router = express.Router();
const Banner = require('../models/Banner');

// GET all banners (Active ones for public, all for admin)
router.get('/', async (req, res) => {
  try {
    const { all } = req.query;
    let query = { isActive: true };
    if (all === 'true') {
      query = {};
    }
    const banners = await Banner.find(query).sort({ order: 1, createdAt: -1 });
    res.json(banners);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin: Add a new banner
router.post('/', async (req, res) => {
  const { title, image, link, order, isActive } = req.body;
  
  if (!title || !image) {
    return res.status(400).json({ message: 'Title and image are required' });
  }

  const banner = new Banner({
    title,
    image,
    link,
    order,
    isActive
  });

  try {
    const newBanner = await banner.save();
    res.status(201).json(newBanner);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Admin: Update a banner
router.put('/:id', async (req, res) => {
  try {
    const banner = await Banner.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!banner) return res.status(404).json({ message: 'Banner not found' });
    res.json(banner);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Admin: Delete a banner
router.delete('/:id', async (req, res) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) return res.status(404).json({ message: 'Banner not found' });
    res.json({ message: 'Banner deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;