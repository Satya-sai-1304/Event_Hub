const express = require('express');
const router = express.Router();
const Coupon = require('../models/Coupon');
const Booking = require('../models/Booking');
const fs = require('fs');
const path = require('path');

const mongoose = require('mongoose');

const DB_FILE = path.join(__dirname, '../db.json');

const readDB = () => {
  if (!fs.existsSync(DB_FILE)) return { coupons: [], bookings: [] };
  const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  if (!data.coupons) data.coupons = [];
  if (!data.bookings) data.bookings = [];
  return data;
};

const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');

// Get all coupons (Admin or Merchant filtering)
router.get('/', async (req, res) => {
  const { merchantId, eventId, categoryId, serviceType, serviceId, applicableType } = req.query;
  try {
    if (req.useMongoDB) {
      let query = { isActive: true };
      
      // If eventId, categoryId, serviceType or serviceId is provided, we are filtering for a specific booking
      if ((eventId && eventId !== "" && eventId !== "null" && mongoose.Types.ObjectId.isValid(eventId)) || 
          (categoryId && categoryId !== "" && categoryId !== "null" && mongoose.Types.ObjectId.isValid(categoryId)) ||
          (serviceType && serviceType !== "" && serviceType !== "null") ||
          (serviceId && serviceId !== "" && serviceId !== "null" && mongoose.Types.ObjectId.isValid(serviceId))) {
        
        const orConditions = [];
        
        // ALWAYS include global coupons first
        orConditions.push({ isGlobal: true });
        
        // Filter based on applicableType - EXCLUSIVE filtering
        if (applicableType === 'EVENT') {
          // For EVENT bookings ONLY: Show EVENT and CATEGORY type coupons (NOT SERVICE)
          orConditions.push({ 
            $or: [
              { applicableType: 'EVENT', applicableEvents: eventId },
              { applicableType: 'CATEGORY', applicableCategory: categoryId }
            ]
          });
        } else if (applicableType === 'SERVICE') {
          // For SERVICE bookings ONLY: Show SERVICE type coupons (NOT EVENT or CATEGORY)
          orConditions.push({ 
            $or: [
              { applicableType: 'SERVICE', applicableServices: { $in: [serviceId] } }
            ]
          });
        } else if (applicableType === 'CATEGORY') {
          // For category-specific filtering
          orConditions.push({ 
            $or: [
              { applicableType: 'CATEGORY', applicableCategory: categoryId }
            ]
          });
        } else {
          // No applicableType specified - infer from what IDs were provided
          // If eventId is provided, assume EVENT booking
          if (eventId && eventId !== "" && mongoose.Types.ObjectId.isValid(eventId)) {
            orConditions.push({ 
              $or: [
                { applicableType: 'EVENT', applicableEvents: eventId },
                { applicableType: 'CATEGORY', applicableCategory: categoryId }
              ]
            });
          }
          // If serviceId or serviceType is provided, assume SERVICE booking
          if ((serviceType && serviceType !== "") || (serviceId && serviceId !== "")) {
            orConditions.push({ 
              $or: [
                { applicableType: 'SERVICE', applicableServices: { $in: [serviceId] } }
              ]
            });
          }
          // Legacy support for old coupon structure
          if (eventId && eventId !== "" && mongoose.Types.ObjectId.isValid(eventId)) {
            orConditions.push({ eventId: eventId });
          }
          if (categoryId && categoryId !== "" && mongoose.Types.ObjectId.isValid(categoryId)) {
            orConditions.push({ categoryId: categoryId });
          }
          if (serviceType && serviceType !== "") {
            orConditions.push({ serviceType: serviceType });
          }
          if (serviceId && serviceId !== "" && mongoose.Types.ObjectId.isValid(serviceId)) {
            orConditions.push({ serviceIds: serviceId });
          }
        }
        
        query.$or = orConditions;
              
        // If merchantId is also provided, it must match
        if (merchantId && merchantId !== "" && merchantId !== "null") {
          query.merchantId = merchantId;
        }
              
      // Filter out coupons that have reached usage limit
      if (!query.$or) {
        query.$or = [];
      }
      
      // Use $expr for field-to-field comparison (prevents CastError)
      const usageCondition = {
        $or: [
          { usageLimit: null }, // No usage limit
          { 
            $expr: {
              $lt: ["$usageCount", "$usageLimit"]
            }
          } // Usage count less than limit
        ]
      };
      
      // Add isActive and expiryDate conditions
      query.isActive = true;
      query.expiryDate = { $gte: new Date() };
      
      query.$or.push(usageCondition);
      } else {
        // If no specific event/category filter, just return based on merchantId (if provided)
        if (merchantId && merchantId !== "" && merchantId !== "null" && merchantId !== "undefined") {
          query.merchantId = merchantId;
        }
        
        // Filter out coupons that have reached usage limit
        if (!query.$or) {
          query.$or = [];
        }
        
        // Use $expr for field-to-field comparison (prevents CastError)
        const usageCondition = {
          $or: [
            { usageLimit: null },
            { 
              $expr: {
                $lt: ["$usageCount", "$usageLimit"]
              }
            }
          ]
        };
        
        // Add isActive and expiryDate conditions
        query.isActive = true;
        query.expiryDate = { $gte: new Date() };
        
        query.$or.push(usageCondition);
      }
      
      const coupons = await Coupon.find(query).sort({ createdAt: -1 });
      res.json(coupons);
    } else {
      const db = readDB();
      let coupons = db.coupons || [];
      coupons = coupons.filter(c => c.isActive !== false);
      
      if ((eventId && eventId !== "") || (categoryId && categoryId !== "")) {
        coupons = coupons.filter(c => 
          c.isGlobal || 
          (c.applicableType === 'ALL') ||
          (c.applicableType === 'EVENT' && c.applicableEvents && c.applicableEvents.some(eid => String(eid) === String(eventId))) ||
          (c.applicableType === 'CATEGORY' && String(c.applicableCategory) === String(categoryId)) ||
          (eventId && c.eventId && String(c.eventId) === String(eventId)) ||
          (categoryId && c.categoryId && String(c.categoryId) === String(categoryId))
        );
        if (merchantId && merchantId !== "") {
          coupons = coupons.filter(c => c.merchantId === merchantId);
        }
      } else if (merchantId && merchantId !== "") {
        coupons = coupons.filter(c => c.merchantId === merchantId);
      }
      
      // Filter out coupons that have reached usage limit
      coupons = coupons.filter(c => !c.usageLimit || c.usageCount < c.usageLimit);
      
      res.json(coupons);
    }
  } catch (error) {
    console.error("Error fetching coupons:", error);
    res.status(500).json({ message: error.message });
  }
});

// Create a coupon
router.post('/', async (req, res) => {
  try {
    const couponData = { ...req.body };
    // Remove empty strings for ObjectId fields to avoid casting errors
    if (couponData.eventId === "") delete couponData.eventId;
    if (couponData.categoryId === "") delete couponData.categoryId;
    if (couponData.merchantId === "") delete couponData.merchantId;
    if (couponData.applicableCategory === "") delete couponData.applicableCategory;
    if (couponData.applicableEvents && Array.isArray(couponData.applicableEvents) && couponData.applicableEvents.length === 0) delete couponData.applicableEvents;
    if (couponData.applicableServices && Array.isArray(couponData.applicableServices) && couponData.applicableServices.length === 0) delete couponData.applicableServices;
    // Convert string IDs to ObjectIds for MongoDB if they exist
    if (couponData.applicableCategory && req.useMongoDB && typeof couponData.applicableCategory === 'string') {
      const mongoose = require('mongoose');
      couponData.applicableCategory = new mongoose.Types.ObjectId(couponData.applicableCategory);
    }

    if (req.useMongoDB) {
      const coupon = new Coupon(couponData);
      const newCoupon = await coupon.save();
      
      // Emit socket event for real-time update
      if (req.io) {
        req.io.emit('couponCreated', newCoupon);
      }
      
      res.status(201).json(newCoupon);
    } else {
      const db = readDB();
      // Check for duplicate code in JSON DB
      const existing = (db.coupons || []).find(c => c.couponCode === couponData.couponCode && c.merchantId === couponData.merchantId);
      if (existing) {
        return res.status(400).json({ message: 'You already have a coupon with this code' });
      }

      const newCoupon = {
        id: Date.now().toString(),
        ...couponData,
        createdAt: new Date().toISOString()
      };
      db.coupons.push(newCoupon);
      writeDB(db);
      
      // Emit socket event for real-time update
      if (req.io) {
        req.io.emit('couponCreated', newCoupon);
      }
      
      res.status(201).json(newCoupon);
    }
  } catch (error) {
    console.error("Error creating coupon:", error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'You already have a coupon with this code' });
    }
    res.status(400).json({ message: error.message });
  }
});

// Validate a coupon
router.post('/validate', async (req, res) => {
  let { code: enteredCouponCode, orderAmount, userId: currentUserId, merchantId, eventId, categoryId, serviceType, serviceId, serviceIds } = req.body;
  
  if (!enteredCouponCode) {
    return res.status(400).json({ message: 'Coupon code is required' });
  }

  const code = enteredCouponCode.toUpperCase();
  
  // Clean up IDs
  if (eventId === "" || eventId === "null") eventId = undefined;
  if (categoryId === "" || categoryId === "null") categoryId = undefined;
  if (serviceType === "" || serviceType === "null") serviceType = undefined;
  if (serviceId === "" || serviceId === "null") serviceId = undefined;
  if (merchantId === "" || merchantId === "null") merchantId = undefined;
  if (currentUserId === "" || currentUserId === "null") currentUserId = undefined;

  console.log("Checking coupon validation:", { currentUserId, code, merchantId, eventId, categoryId, serviceType, serviceId, serviceIds, orderAmount });

  try {
    let coupon;
    if (req.useMongoDB) {
      coupon = await Coupon.findOne({ couponCode: code, isActive: true });
    } else {
      const db = readDB();
      coupon = db.coupons.find(c => c.couponCode === code && c.isActive !== false);
    }

    if (!coupon) {
      return res.status(404).json({ message: 'Invalid or inactive coupon code' });
    }

    // Step 2: Check merchant match
    if (merchantId && coupon.merchantId.toString() !== merchantId.toString()) {
      // Allow admin coupons to be used globally if no other restrictions apply
      if (coupon.merchantId.toString() !== 'admin') {
        return res.status(400).json({ message: 'This coupon is not valid for this vendor' });
      }
    }

    // Step 3: Check applicableType and event/category/serviceType match if not global
    if (coupon.isGlobal === false || coupon.applicableType !== 'ALL') {
      let isMatch = false;

      // NEW LOGIC: Check based on applicableType
      if (coupon.applicableType === 'EVENT') {
        // Match by eventId in applicableEvents array
        if (eventId && eventId !== "" && coupon.applicableEvents) {
          if (coupon.applicableEvents.some(eid => eid.toString() === eventId.toString())) {
            isMatch = true;
          }
        }
      } else if (coupon.applicableType === 'CATEGORY') {
        // Match by categoryId in applicableCategory
        // For event bookings, also check if the event belongs to this category
        if (categoryId && categoryId !== "" && coupon.applicableCategory) {
          if (coupon.applicableCategory.toString() === categoryId.toString()) {
            isMatch = true;
          }
        }
        
        // Match by category name if available (legacy or fallback)
        if (!isMatch && serviceType && coupon.serviceType) {
          if (coupon.serviceType.toLowerCase() === serviceType.toLowerCase()) {
            isMatch = true;
          }
        }
      } else if (coupon.applicableType === 'SERVICE') {
        // Match by serviceId in applicableServices array
        if (serviceId && serviceId !== "") {
          if (coupon.applicableServices && coupon.applicableServices.some(sid => sid.toString() === serviceId.toString())) {
            isMatch = true;
          }
        }
        // Also check by serviceType if specified (like "Decoration")
        if (!isMatch && serviceType && coupon.serviceType) {
          if (coupon.serviceType === serviceType) {
            isMatch = true;
          }
        }
        // Also check serviceIds array (multiple services)
        if (!isMatch && serviceIds && Array.isArray(serviceIds)) {
          if (coupon.applicableServices && coupon.applicableServices.some(sid => serviceIds.some(cid => cid.toString() === sid.toString()))) {
            isMatch = true;
          }
        }
      } else if (coupon.applicableType === 'ALL') {
        // ALL type coupons are always valid
        isMatch = true;
      }

      // LEGACY SUPPORT: Check old fields for backward compatibility
      if (!isMatch) {
        // Match by eventId if specified
        if (coupon.eventId && eventId && eventId !== "") {
          if (coupon.eventId.toString() === eventId.toString()) {
            isMatch = true;
          }
        }

        // Match by categoryId if specified
        if (coupon.categoryId && categoryId && categoryId !== "") {
          if (coupon.categoryId.toString() === categoryId.toString()) {
            isMatch = true;
          }
        }

        // Match by serviceType if specified
        if (coupon.serviceType && serviceType && serviceType !== "") {
          if (coupon.serviceType === serviceType) {
            isMatch = true;
          }
        }

        // Match by serviceId if specified (legacy field)
        if (coupon.serviceIds && coupon.serviceIds.length > 0) {
          // If single serviceId provided
          if (serviceId && serviceId !== "") {
            if (coupon.serviceIds.some(sid => sid.toString() === serviceId.toString())) {
              isMatch = true;
            }
          }
          // If multiple serviceIds provided
          if (!isMatch && serviceIds && Array.isArray(serviceIds)) {
            if (coupon.serviceIds.some(sid => serviceIds.some(cid => cid.toString() === sid.toString()))) {
              isMatch = true;
            }
          }
        }
      }

      // SPECIAL CASE: For EVENT bookings, CATEGORY type coupons should also be valid
      // This is important because event bookings often have category-based coupons
      if (!isMatch && eventId && eventId !== "" && categoryId && categoryId !== "") {
        if (coupon.applicableType === 'CATEGORY' && coupon.applicableCategory) {
          if (coupon.applicableCategory.toString() === categoryId.toString()) {
            isMatch = true;
          }
        }
      }

      // If neither matches and coupon has restrictions, it's invalid
      if (!isMatch && (
        (coupon.applicableType && coupon.applicableType !== 'ALL') ||
        coupon.eventId || 
        coupon.categoryId || 
        coupon.serviceType || 
        (coupon.serviceIds && coupon.serviceIds.length > 0) ||
        (coupon.applicableServices && coupon.applicableServices.length > 0)
      )) {
        return res.status(400).json({ message: 'Coupon not valid for this event or service' });
      }
    }

    // Step 4: Check minimum order amount BEFORE checking usage
    if (orderAmount && orderAmount < coupon.minimumOrderAmount) {
      return res.status(400).json({ 
        message: `Minimum order amount of ₹${coupon.minimumOrderAmount} required for this coupon` 
      });
    }

    // Step 5: Check one-time usage
    if (currentUserId) {
      if (coupon.usedBy && coupon.usedBy.includes(currentUserId)) {
        return res.status(400).json({ message: 'You have already used this coupon' });
      }
      
      // Also check existing bookings as a fallback
      let existingBooking;
      if (req.useMongoDB) {
        existingBooking = await Booking.findOne({ 
          $or: [{ userId: currentUserId }, { customerId: currentUserId }], 
          couponCode: code,
          status: { $nin: ['cancelled', 'rejected'] }
        });
      } else {
        const db = readDB();
        existingBooking = (db.bookings || []).find(b => 
          (b.userId === currentUserId || b.customerId === currentUserId) && 
          b.couponCode === code && 
          !['cancelled', 'rejected'].includes(b.status)
        );
      }

      if (existingBooking) {
        return res.status(400).json({ message: 'You have already used this coupon' });
      }
    }

    // Step 6: Check usage limit
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return res.status(400).json({ message: 'Coupon usage limit has been reached' });
    }

    // Step 7: Final expiry check
    if (new Date(coupon.expiryDate) < new Date()) {
      return res.status(400).json({ message: 'Coupon has expired' });
    }

    res.json(coupon);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a coupon
router.delete('/:id', async (req, res) => {
  try {
    if (req.useMongoDB) {
      await Coupon.findByIdAndDelete(req.params.id);
      res.json({ message: 'Coupon deleted' });
    } else {
      const db = readDB();
      db.coupons = db.coupons.filter(c => c.id !== req.params.id);
      writeDB(db);
      res.json({ message: 'Coupon deleted' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark coupon as used (increment usage count)
router.post('/use', async (req, res) => {
  const { code, userId } = req.body;
  
  if (!code) {
    return res.status(400).json({ message: 'Coupon code is required' });
  }

  try {
    if (req.useMongoDB) {
      const coupon = await Coupon.findOne({ couponCode: code.toUpperCase() });
      if (!coupon) {
        return res.status(404).json({ message: 'Coupon not found' });
      }
      
      // Check usage limit
      if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
        return res.status(400).json({ message: 'Coupon usage limit has been reached' });
      }
      
      // Increment usage count
      coupon.usageCount += 1;
      
      // Add user to usedBy array if not already present
      if (userId && !coupon.usedBy.includes(userId)) {
        coupon.usedBy.push(userId);
      }
      
      await coupon.save();
      res.json({ message: 'Coupon marked as used', coupon });
    } else {
      const db = readDB();
      const coupon = db.coupons.find(c => c.couponCode === code.toUpperCase());
      
      if (!coupon) {
        return res.status(404).json({ message: 'Coupon not found' });
      }
      
      // Check usage limit
      if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
        return res.status(400).json({ message: 'Coupon usage limit has been reached' });
      }
      
      // Find and update coupon
      const couponIndex = db.coupons.findIndex(c => c.id === coupon.id);
      if (couponIndex > -1) {
        db.coupons[couponIndex].usageCount += 1;
        if (userId && !db.coupons[couponIndex].usedBy.includes(userId)) {
          db.coupons[couponIndex].usedBy.push(userId);
        }
        writeDB(db);
        res.json({ message: 'Coupon marked as used', coupon: db.coupons[couponIndex] });
      } else {
        return res.status(404).json({ message: 'Coupon not found' });
      }
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
