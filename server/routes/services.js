const express = require('express');
const router = express.Router();
const Service = require('../models/Service');
const Category = require('../models/Category');
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../db.json');

const readDB = () => {
  if (!fs.existsSync(DB_FILE)) return { events: [], bookings: [], users: [], services: [] };
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
};

const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');

// Get all services - STRICT MERCHANT ISOLATION
router.get('/', async (req, res) => {
  try {
    const { search, type, category, merchantId } = req.query;
    
    if (req.useMongoDB) {
      const filter = { isActive: true };
      
      // Merchant isolation for their dashboard views when merchantId is provided
      if (merchantId) {
        filter.merchantId = merchantId;
      } else if (req.user?.role === 'merchant' || req.user?.role === 'organizer') {
        // Organizers viewing without explicit merchantId should see only their own
        filter.merchantId = req.user.id || req.user._id;
      }
      // Admins and customers without merchantId will see all active services
      
      if (type) {
        filter.type = new RegExp('^' + type + '$', 'i');
      }
      
      if (category) {
        filter.category = new RegExp('^' + category + '$', 'i');
      }

      if (search) {
        const searchRegex = new RegExp(search, 'i');
        filter.$or = [
          { name: { $regex: searchRegex } },
          { description: { $regex: searchRegex } },
          { category: { $regex: searchRegex } },
          { type: { $regex: searchRegex } }
        ];
      }

      const services = await Service.find(filter).populate('categoryId').sort({ createdAt: -1 });
      const mappedServices = services.map(s => {
        const obj = s.toObject();
        obj.category_id = obj.categoryId ? (obj.categoryId._id || obj.categoryId) : null;
        return obj;
      });
      res.json(mappedServices);
    } else {
      const db = readDB();
      let services = (db.services || []).filter(s => s.isActive !== false);
      
      if (type) {
        services = services.filter(s => s.type && s.type.toLowerCase() === type.toLowerCase());
      }
      
      if (category) {
        services = services.filter(s => s.category && s.category.toLowerCase() === category.toLowerCase());
      }
      
      if (merchantId) {
        services = services.filter(s => s.merchantId === merchantId);
      }

      if (search) {
        const searchLower = search.toLowerCase();
        services = services.filter(s => 
          (s.name && s.name.toLowerCase().includes(searchLower)) ||
          (s.description && s.description.toLowerCase().includes(searchLower)) ||
          (s.category && s.category.toLowerCase().includes(searchLower)) ||
          (s.type && s.type.toLowerCase().includes(searchLower))
        );
      }
      
      res.json(services.reverse());
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single service by ID
router.get('/:id', async (req, res) => {
  try {
    if (req.useMongoDB) {
      const service = await Service.findById(req.params.id).populate('categoryId');
      if (!service) return res.status(404).json({ message: 'Service not found' });
      const obj = service.toObject();
      obj.category_id = obj.categoryId ? (obj.categoryId._id || obj.categoryId) : null;
      res.json(obj);
    } else {
      const db = readDB();
      const service = (db.services || []).find(s => s.id === req.params.id);
      if (!service) return res.status(404).json({ message: 'Service not found' });
      res.json(service);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a service - ALWAYS attach merchantId
router.post('/', async (req, res) => {
  try {
    if (req.useMongoDB) {
      const serviceData = { ...req.body };
      
      // Remove empty fields to avoid validation errors
      if (serviceData.categoryId === "") delete serviceData.categoryId;
      if (serviceData.category === "") delete serviceData.category;
      
      // CRITICAL: Always attach merchantId from request
      if (!serviceData.merchantId) {
        return res.status(400).json({ message: 'Merchant ID is required' });
      }
      
      // Try to find category by name if categoryId is not provided
      if (!serviceData.categoryId && serviceData.category) {
        const Category = require('../models/Category');
        const cat = await Category.findOne({ 
          name: serviceData.category,
          merchantId: serviceData.merchantId // Only search within merchant's categories
        });
        if (cat) serviceData.categoryId = cat._id;
      }

      // Sync price and basePrice
      if (serviceData.price !== undefined && serviceData.basePrice === undefined) {
        serviceData.basePrice = serviceData.price;
      }

      const service = new Service(serviceData);
      const newService = await service.save();
      res.status(201).json(newService);
    } else {
      const db = readDB();
      if (!db.services) db.services = [];
      const newService = {
        ...req.body,
        id: Date.now().toString(),
        isActive: true,
        createdAt: new Date().toISOString()
      };
      db.services.push(newService);
      writeDB(db);
      res.status(201).json(newService);
    }
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Service already exists for your account' });
    }
    res.status(400).json({ message: err.message });
  }
});

// Update a service
router.put('/:id', async (req, res) => {
    try {
        if (req.useMongoDB) {
            const service = await Service.findById(req.params.id);
            if (!service) return res.status(404).json({ message: 'Service not found' });

            if (req.body.name != null) service.name = req.body.name;
            if (req.body.category != null) service.category = req.body.category;
            if (req.body.type != null) service.type = req.body.type;
            if (req.body.price != null) {
              service.price = req.body.price;
              service.basePrice = req.body.price;
            }
            if (req.body.description != null) service.description = req.body.description;
            if (req.body.image != null) service.image = req.body.image;
            if (req.body.foodType != null) service.foodType = req.body.foodType;

            const updatedService = await service.save();
            res.json(updatedService);
        } else {
            const db = readDB();
            const index = db.services.findIndex(s => s.id === req.params.id);
            if (index === -1) return res.status(404).json({ message: 'Service not found' });
            
            db.services[index] = { ...db.services[index], ...req.body };
            writeDB(db);
            res.json(db.services[index]);
        }
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

// Delete a service (soft delete)
router.delete('/:id', async (req, res) => {
    try {
        if (req.useMongoDB) {
            const service = await Service.findByIdAndUpdate(
              req.params.id,
              { isActive: false },
              { new: true }
            );
            if (!service) return res.status(404).json({ message: 'Service not found' });
            res.json({ message: 'Service deleted successfully' });
        } else {
            const db = readDB();
            const index = db.services.findIndex(s => s.id === req.params.id);
            if (index === -1) return res.status(404).json({ message: 'Service not found' });
            
            db.services[index].isActive = false;
            writeDB(db);
            res.json({ message: 'Service deleted successfully' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get service types for a specific merchant - STRICT ISOLATION
router.get('/service-types', async (req, res) => {
  try {
    const merchantId = req.user?.id || req.user?._id;
    
    // STRICT ISOLATION: merchantId is REQUIRED
    if (!merchantId) {
      return res.json([]);
    }
    
    // Get ONLY this merchant's service types (isGlobal: true)
    const query = { isGlobal: true, merchantId: merchantId };
    const serviceTypes = await Category.find(query).sort({ createdAt: -1 });
    res.json(serviceTypes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
