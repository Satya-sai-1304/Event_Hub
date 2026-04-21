const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Payout = require('../models/Payout');
const Transaction = require('../models/Transaction');
const Booking = require('../models/Booking');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DB_FILE = path.join(__dirname, '../db.json');

const sampleMerchants = [
  {
    "id": 1,
    "name": "Sai Decorations",
    "services": ["Decoration", "Lighting"],
    "description": "Wedding & event decoration specialist",
    "rating": 4.7,
    "contact": "Sai@gmail.com",
    "profileImage": ""
  },
  {
    "id": 2,
    "name": "Royal Catering",
    "services": ["Catering", "Buffet"],
    "description": "Premium catering for all occasions",
    "rating": 4.5,
    "contact": "Royal@gmail.com",
    "profileImage": ""
  },
  {
    "id": 3,
    "name": "Visual Moments",
    "services": ["Photography", "Videography"],
    "description": "Capture your special moments forever",
    "rating": 4.8,
    "contact": "Visual@gmail.com",
    "profileImage": ""
  }
];

const readDB = () => {
  if (!fs.existsSync(DB_FILE)) return { events: [], bookings: [], users: [] };
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
};

const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');

// Get all merchants
router.get('/', async (req, res) => {
  try {
    if (req.useMongoDB) {
      const merchants = await User.find({ role: 'organizer' });
      if (merchants.length > 0) {
        return res.json(merchants.map(m => ({
          id: m._id,
          name: m.name,
          services: m.services || [],
          description: m.description || '',
          rating: m.rating || 0,
          contact: m.email, // Using email as contact info if nothing else
          profileImage: m.profileImage || ''
        })));
      }
    } else {
      const db = readDB();
      const merchants = db.users ? db.users.filter(u => u.role === 'organizer') : [];
      if (merchants.length > 0) {
        return res.json(merchants.map(m => ({
          id: m.id,
          name: m.name,
          services: m.services || [],
          description: m.description || '',
          rating: m.rating || 0,
          contact: m.email,
          profileImage: m.profileImage || ''
        })));
      }
    }
    
    // Return sample data if no merchants found in DB
    res.json(sampleMerchants);
  } catch (err) {
    console.error('Error fetching merchants:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// Get single merchant by ID
router.get('/:id', async (req, res) => {
  try {
    if (req.useMongoDB) {
      const merchant = await User.findById(req.params.id);
      if (!merchant || merchant.role !== 'organizer') return res.status(404).json({ message: 'Merchant not found' });
      res.json({
        id: merchant._id,
        name: merchant.name,
        services: merchant.services || [],
        description: merchant.description || '',
        rating: merchant.rating || 0,
        contact: merchant.email,
        location: merchant.location || { lat: 17.3850, lng: 78.4867 }, // Default to Hyderabad
        profileImage: merchant.profileImage || '',
        images: merchant.images || []
      });
    } else {
      const db = readDB();
      const merchant = (db.users || []).find(u => (u.id === req.params.id || u._id === req.params.id) && u.role === 'organizer');
      if (!merchant) return res.status(404).json({ message: 'Merchant not found' });
      res.json({
        id: merchant.id || merchant._id,
        name: merchant.name,
        services: merchant.services || [],
        description: merchant.description || '',
        rating: merchant.rating || 0,
        contact: merchant.email,
        location: merchant.location || { lat: 17.3850, lng: 78.4867 },
        profileImage: merchant.profileImage || '',
        images: merchant.images || []
      });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Activate Merchant Account
router.post('/setup', async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ message: 'Token and password are required' });
  }

  try {
    if (req.useMongoDB) {
      const user = await User.findOne({ inviteToken: token });

      if (!user) {
        return res.status(400).json({ message: 'Invalid invitation token' });
      }

      // Check expiry
      if (user.inviteTokenExpiry && user.inviteTokenExpiry < new Date()) {
        return res.status(400).json({ message: 'Invitation has expired. Please contact support.' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      user.password = hashedPassword;
      user.status = 'active';
      user.isApproved = true;
      user.inviteToken = null;
      user.inviteTokenExpiry = null;
      await user.save();

      res.json({ message: 'Account activated successfully' });
    } else {
      const db = readDB();
      const userIndex = db.users.findIndex(u => u.inviteToken === token);

      if (userIndex === -1) {
        return res.status(400).json({ message: 'Invalid invitation token' });
      }

      const user = db.users[userIndex];

      // Check expiry
      if (user.inviteTokenExpiry && new Date(user.inviteTokenExpiry) < new Date()) {
        return res.status(400).json({ message: 'Invitation has expired. Please contact support.' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      user.password = hashedPassword;
      user.status = 'active';
      user.isApproved = true;
      user.inviteToken = null;
      user.inviteTokenExpiry = null;
      writeDB(db);

      res.json({ message: 'Account activated successfully' });
    }
  } catch (err) {
    console.error('Merchant activation error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// Get merchant wallet info
router.get('/:merchantId/wallet', async (req, res) => {
  try {
    const { merchantId } = req.params;
    if (req.useMongoDB) {
      let wallet = await Wallet.findOne({ merchantId });
      if (!wallet) {
        wallet = await Wallet.create({ merchantId });
      }
      res.json(wallet);
    } else {
      const db = readDB();
      if (!db.wallets) db.wallets = [];
      let wallet = db.wallets.find(w => w.merchantId === merchantId);
      if (!wallet) {
        wallet = {
          id: uuidv4(),
          merchantId,
          totalEarnings: 0,
          commissionDeducted: 0,
          netBalance: 0,
          pendingPayout: 0,
          updatedAt: new Date().toISOString()
        };
        db.wallets.push(wallet);
        writeDB(db);
      }
      res.json(wallet);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Request a payout
router.post('/:merchantId/payouts', async (req, res) => {
  try {
    const { merchantId } = req.params;
    const { amount, bankDetails } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Invalid payout amount' });
    }

    if (req.useMongoDB) {
      const wallet = await Wallet.findOne({ merchantId });
      if (!wallet || wallet.netBalance < amount) {
        return res.status(400).json({ message: 'Insufficient balance' });
      }

      // Create payout request
      const payout = await Payout.create({
        merchantId,
        amount,
        status: 'pending',
        requestedAt: new Date(),
        bankDetails
      });

      // Update wallet: move from netBalance to pendingPayout
      wallet.netBalance -= amount;
      wallet.pendingPayout += amount;
      wallet.updatedAt = new Date();
      await wallet.save();

      res.status(201).json(payout);
    } else {
      const db = readDB();
      if (!db.wallets) db.wallets = [];
      const walletIndex = db.wallets.findIndex(w => w.merchantId === merchantId);
      
      if (walletIndex === -1 || db.wallets[walletIndex].netBalance < amount) {
        return res.status(400).json({ message: 'Insufficient balance' });
      }

      const payout = {
        id: uuidv4(),
        merchantId,
        amount,
        status: 'pending',
        requestedAt: new Date().toISOString(),
        bankDetails
      };

      if (!db.payouts) db.payouts = [];
      db.payouts.push(payout);

      // Update wallet
      db.wallets[walletIndex].netBalance -= amount;
      db.wallets[walletIndex].pendingPayout += amount;
      db.wallets[walletIndex].updatedAt = new Date().toISOString();

      writeDB(db);
      res.status(201).json(payout);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all payouts (for admin) or merchant payouts
router.get('/payouts/all', async (req, res) => {
  try {
    const { merchantId, status } = req.query;
    const query = {};
    if (merchantId) query.merchantId = merchantId;
    if (status) query.status = status;

    if (req.useMongoDB) {
      const payouts = await Payout.find(query).sort({ requestedAt: -1 });
      res.json(payouts);
    } else {
      const db = readDB();
      if (!db.payouts) db.payouts = [];
      let payouts = db.payouts;
      if (merchantId) payouts = payouts.filter(p => p.merchantId === merchantId);
      if (status) payouts = payouts.filter(p => p.status === status);
      res.json(payouts.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt)));
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Approve/Pay a payout (for admin)
router.patch('/payouts/:payoutId', async (req, res) => {
  try {
    const { payoutId } = req.params;
    const { status } = req.body; // 'approved', 'paid', 'rejected'

    if (!['approved', 'paid', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    if (req.useMongoDB) {
      const payout = await Payout.findById(payoutId);
      if (!payout) return res.status(404).json({ message: 'Payout not found' });

      const oldStatus = payout.status;
      payout.status = status;
      if (status === 'paid') payout.paidAt = new Date();
      await payout.save();

      // If status changed to rejected, return funds to netBalance
      if (status === 'rejected' && oldStatus !== 'rejected') {
        await Wallet.findOneAndUpdate(
          { merchantId: payout.merchantId },
          { 
            $inc: { netBalance: payout.amount, pendingPayout: -payout.amount },
            updatedAt: new Date()
          }
        );
      } else if (status === 'paid' && oldStatus !== 'paid') {
        // If paid, subtract from pendingPayout and add to totalWithdrawn
        await Wallet.findOneAndUpdate(
          { merchantId: payout.merchantId },
          { 
            $inc: { pendingPayout: -payout.amount, totalWithdrawn: payout.amount },
            updatedAt: new Date()
          }
        );
      }

      res.json(payout);
    } else {
      const db = readDB();
      if (!db.payouts) db.payouts = [];
      const payoutIndex = db.payouts.findIndex(p => p.id === payoutId);
      if (payoutIndex === -1) return res.status(404).json({ message: 'Payout not found' });

      const payout = db.payouts[payoutIndex];
      const oldStatus = payout.status;
      payout.status = status;
      if (status === 'paid') payout.paidAt = new Date().toISOString();

      const walletIndex = db.wallets.findIndex(w => w.merchantId === payout.merchantId);
      if (walletIndex !== -1) {
        if (status === 'rejected' && oldStatus !== 'rejected') {
          db.wallets[walletIndex].netBalance += payout.amount;
          db.wallets[walletIndex].pendingPayout -= payout.amount;
        } else if (status === 'paid' && oldStatus !== 'paid') {
          db.wallets[walletIndex].pendingPayout -= payout.amount;
          if (!db.wallets[walletIndex].totalWithdrawn) db.wallets[walletIndex].totalWithdrawn = 0;
          db.wallets[walletIndex].totalWithdrawn += payout.amount;
        }
        db.wallets[walletIndex].updatedAt = new Date().toISOString();
      }

      writeDB(db);
      res.json(payout);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get merchant earnings summary
router.get('/:merchantId/earnings', async (req, res) => {
  try {
    const { merchantId } = req.params;
    
    if (req.useMongoDB) {
      const bookingsCount = await Booking.countDocuments({ organizerId: merchantId, status: { $in: ['confirmed', 'paid', 'completed'] } });
      const transactions = await Transaction.find({ merchantId });
      
      const totalRevenue = transactions.reduce((sum, t) => sum + t.totalAmount, 0);
      const adminCommission = transactions.reduce((sum, t) => sum + t.adminCommission, 0);
      const netEarnings = transactions.reduce((sum, t) => sum + t.merchantEarnings, 0);
      
      const wallet = await Wallet.findOne({ merchantId });
      
      res.json({
        totalBookings: bookingsCount,
        totalRevenue,
        adminCommission,
        netEarnings,
        pendingPayout: wallet ? wallet.pendingPayout : 0,
        netBalance: wallet ? wallet.netBalance : 0,
        totalWithdrawn: wallet ? wallet.totalWithdrawn : 0
      });
    } else {
      const db = readDB();
      const bookingsCount = db.bookings.filter(b => b.organizerId === merchantId && ['confirmed', 'paid', 'completed'].includes(b.status)).length;
      const transactions = (db.transactions || []).filter(t => t.merchantId === merchantId);
      
      const totalRevenue = transactions.reduce((sum, t) => sum + t.totalAmount, 0);
      const adminCommission = transactions.reduce((sum, t) => sum + t.adminCommission, 0);
      const netEarnings = transactions.reduce((sum, t) => sum + t.merchantEarnings, 0);
      
      const wallet = (db.wallets || []).find(w => w.merchantId === merchantId);
      
      res.json({
        totalBookings: bookingsCount,
        totalRevenue,
        adminCommission,
        netEarnings,
        pendingPayout: wallet ? wallet.pendingPayout : 0,
        netBalance: wallet ? wallet.netBalance : 0,
        totalWithdrawn: wallet ? wallet.totalWithdrawn : 0
      });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
