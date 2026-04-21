const express = require('express');
const router = express.Router();
const User = require('../models/User');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const { sendOTP } = require('../utils/email');
const { sendInviteEmail } = require('../utils/sendInviteEmail');

const DB_FILE = path.join(__dirname, '../db.json');

const readDB = () => {
  if (!fs.existsSync(DB_FILE)) return { events: [], bookings: [], users: [] };
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
};

const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');

// Get all users
router.get('/', async (req, res) => {
  try {
    if (req.useMongoDB) {
      const users = await User.find().sort({ createdAt: -1 });
      const sanitizedUsers = users.map(u => ({
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        role: u.role,
        isApproved: u.isApproved,
        createdAt: u.createdAt
      }));
      res.json(sanitizedUsers);
    } else {
      const db = readDB();
      const sanitizedUsers = db.users.map(u => {
        const { password, ...withoutPassword } = u;
        return withoutPassword;
      });
      res.json(sanitizedUsers);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single user by ID
router.get('/:id', async (req, res) => {
  try {
    if (req.useMongoDB) {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ message: 'User not found' });
      const { password, ...withoutPassword } = user.toObject();
      res.json({ ...withoutPassword, id: user._id.toString() });
    } else {
      const db = readDB();
      const user = db.users.find(u => u.id === req.params.id || u._id === req.params.id);
      if (!user) return res.status(404).json({ message: 'User not found' });
      const { password, ...withoutPassword } = user;
      res.json(withoutPassword);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update user profile
router.patch('/:id', async (req, res) => {
  try {
    const updates = req.body;
    // Don't allow password updates via this route
    delete updates.password;
    delete updates.role;
    delete updates.email;

    if (req.useMongoDB) {
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { $set: updates },
        { new: true, runValidators: true }
      );
      if (!user) return res.status(404).json({ message: 'User not found' });
      const { password, ...withoutPassword } = user.toObject();
      res.json({ ...withoutPassword, id: user._id.toString() });
    } else {
      const db = readDB();
      const index = db.users.findIndex(u => u.id === req.params.id || u._id === req.params.id);
      if (index === -1) return res.status(404).json({ message: 'User not found' });
      
      db.users[index] = { ...db.users[index], ...updates };
      writeDB(db);
      const { password, ...withoutPassword } = db.users[index];
      res.json(withoutPassword);
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Add activity tracking route
router.post('/:id/activity', async (req, res) => {
  try {
    const { eventId, type, category } = req.body;
    
    if (req.useMongoDB) {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ message: 'User not found' });
      
      // Add activity
      user.activity.push({ eventId, type });
      
      // Update interests if category is provided
      if (category && !user.interests.includes(category)) {
        user.interests.push(category);
      }
      
      await user.save();
      res.json({ success: true });
    } else {
      // JSON DB fallback
      const db = readDB();
      const userIndex = db.users.findIndex(u => u.id === req.params.id || u._id === req.params.id);
      if (userIndex === -1) return res.status(404).json({ message: 'User not found' });
      
      const user = db.users[userIndex];
      if (!user.activity) user.activity = [];
      if (!user.interests) user.interests = [];
      
      user.activity.push({ eventId, type, timestamp: new Date().toISOString() });
      if (category && !user.interests.includes(category)) {
        user.interests.push(category);
      }
      
      writeDB(db);
      res.json({ success: true });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update device token for push notifications
router.patch('/:id/device-token', async (req, res) => {
  try {
    const { deviceToken } = req.body;
    
    if (req.useMongoDB) {
      await User.findByIdAndUpdate(req.params.id, { deviceToken });
      res.json({ success: true });
    } else {
      const db = readDB();
      const index = db.users.findIndex(u => u.id === req.params.id || u._id === req.params.id);
      if (index === -1) return res.status(404).json({ message: 'User not found' });
      
      db.users[index].deviceToken = deviceToken;
      writeDB(db);
      res.json({ success: true });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin adds a merchant (organizer)
router.post('/add-merchant', async (req, res) => {
  const { name, email } = req.body;

  try {
    if (req.useMongoDB) {
      const existingUser = await User.findOne({ email });
      if (existingUser) return res.status(400).json({ message: 'User already exists' });

      const inviteToken = uuidv4();
      const inviteTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const newMerchant = new User({
        name,
        email,
        role: 'organizer',
        status: 'invited',
        isApproved: false,
        inviteToken,
        inviteTokenExpiry
      });
      await newMerchant.save();

      await sendInviteEmail(email, inviteToken);

      res.status(201).json({
        message: 'Merchant invited successfully.',
        user: {
          id: newMerchant._id.toString(),
          name: newMerchant.name,
          email: newMerchant.email,
          role: newMerchant.role,
          status: newMerchant.status,
          createdAt: newMerchant.createdAt
        }
      });
    } else {
      const db = readDB();
      if (db.users.find(u => u.email === email)) {
        return res.status(400).json({ message: 'User already exists' });
      }

      const inviteToken = uuidv4();
      const inviteTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      const newMerchant = {
        id: uuidv4(),
        name,
        email,
        role: 'organizer',
        status: 'invited',
        isApproved: false,
        inviteToken,
        inviteTokenExpiry,
        createdAt: new Date().toISOString()
      };
      db.users.push(newMerchant);
      writeDB(db);

      await sendInviteEmail(email, inviteToken);

      res.status(201).json({
        message: 'Merchant invited successfully.',
        user: {
          id: newMerchant.id,
          name: newMerchant.name,
          email: newMerchant.email,
          role: newMerchant.role,
          status: newMerchant.status,
          createdAt: newMerchant.createdAt
        }
      });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  console.log(`Login attempt: ${email}`);

  try {
    if (req.useMongoDB) {
      console.log('Searching in MongoDB...');
      const user = await User.findOne({ email });
      if (!user) {
        console.log('User not found in MongoDB');
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      let isMatch = false;
      if (user.password && user.password.startsWith('$2')) {
        isMatch = await bcrypt.compare(password, user.password);
      } else {
        isMatch = (password === user.password);
      }

      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      if (user.role === 'organizer' && !user.isApproved) {
        // Automatically resend OTP if they try to login before verifying
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otpExpires = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();
        await sendOTP(user.email, otp);

        return res.status(403).json({
          message: 'Account not verified. A new OTP has been sent to your email.',
          requiresVerification: true,
          email: user.email
        });
      }

      console.log('User found in MongoDB');
      const userResponse = {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
        createdAt: user.createdAt
      };
      res.json({ message: 'Login successful', user: userResponse });
    } else {
      console.log('Searching in db.json...');
      const db = readDB();
      const user = db.users.find(u => u.email === email);
      if (!user) {
        console.log('User not found in db.json');
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      let isMatch = false;
      if (user.password && user.password.startsWith('$2')) {
        isMatch = await bcrypt.compare(password, user.password);
      } else {
        isMatch = (password === user.password);
      }

      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      if (user.role === 'organizer' && !user.isApproved) {
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otpExpires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
        writeDB(db);
        await sendOTP(user.email, otp);

        return res.status(403).json({
          message: 'Account not verified. A new OTP has been sent to your email.',
          requiresVerification: true,
          email: user.email
        });
      }

      console.log('User found in db.json');
      const { password: _, ...userWithoutPassword } = user;
      res.json({ message: 'Login successful', user: userWithoutPassword });
    }
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// Standard Register (Customers only)
router.post('/', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    if (req.useMongoDB) {
      const existingUser = await User.findOne({ email });
      if (existingUser) return res.status(400).json({ message: 'User already exists' });

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const user = new User({
        name,
        email,
        password: hashedPassword,
        role: 'customer',
        isApproved: true
      });
      const newUser = await user.save();
      res.status(201).json({
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isApproved: newUser.isApproved,
        createdAt: newUser.createdAt
      });
    } else {
      const db = readDB();
      if (db.users.find(u => u.email === email)) {
        return res.status(400).json({ message: 'User already exists' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newUser = {
        id: uuidv4(),
        name,
        email,
        password: hashedPassword,
        role: 'customer',
        isApproved: true,
        createdAt: new Date().toISOString()
      };
      db.users.push(newUser);
      writeDB(db);
      const { password: _p, ...userWithoutPassword } = newUser;
      res.status(201).json(userWithoutPassword);
    }
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Verify OTP
router.post('/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return res.status(400).json({ message: 'Email and OTP are required' });
  }

  try {
    if (req.useMongoDB) {
      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ message: 'User not found' });

      if (user.isApproved) return res.status(400).json({ message: 'Account is already verified' });

      if (user.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });

      if (user.otpExpires < new Date()) return res.status(400).json({ message: 'OTP has expired. Please log in again to receive a new one.' });

      user.isApproved = true;
      user.otp = undefined;
      user.otpExpires = undefined;
      await user.save();

      res.json({ message: 'OTP verified successfully. You can now log in.' });
    } else {
      const db = readDB();
      const userIndex = db.users.findIndex(u => u.email === email);
      if (userIndex === -1) return res.status(404).json({ message: 'User not found' });

      const user = db.users[userIndex];
      if (user.isApproved) return res.status(400).json({ message: 'Account is already verified' });

      if (user.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });

      if (new Date(user.otpExpires) < new Date()) return res.status(400).json({ message: 'OTP has expired. Please log in again to receive a new one.' });

      user.isApproved = true;
      user.otp = undefined;
      user.otpExpires = undefined;
      writeDB(db);

      res.json({ message: 'OTP verified successfully. You can now log in.' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin approves an organizer
router.patch('/:id/approve', async (req, res) => {
  try {
    if (req.useMongoDB) {
      const user = await User.findByIdAndUpdate(req.params.id, { isApproved: true }, { new: true });
      if (!user) return res.status(404).json({ message: 'User not found' });
      res.json({
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
        createdAt: user.createdAt
      });
    } else {
      const db = readDB();
      const index = db.users.findIndex(u => u.id === req.params.id);
      if (index === -1) return res.status(404).json({ message: 'User not found' });
      db.users[index].isApproved = true;
      writeDB(db);
      const { password, ...withoutPassword } = db.users[index];
      res.json(withoutPassword);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Merchant sets up their password
router.post('/merchant-setup', async (req, res) => {
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

      if (user.inviteTokenExpiry < new Date()) {
        return res.status(400).json({ message: 'Invitation has expired. Please contact support.' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      user.password = hashedPassword;
      user.status = 'active';
      user.isApproved = true;
      user.inviteToken = undefined;
      user.inviteTokenExpiry = undefined;
      await user.save();

      res.json({ message: 'Password set successfully. You can now log in.' });
    } else {
      const db = readDB();
      const userIndex = db.users.findIndex(u => u.inviteToken === token);

      if (userIndex === -1) {
        return res.status(400).json({ message: 'Invalid invitation token' });
      }

      const user = db.users[userIndex];

      if (new Date(user.inviteTokenExpiry) < new Date()) {
        return res.status(400).json({ message: 'Invitation has expired. Please contact support.' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      user.password = hashedPassword;
      user.status = 'active';
      user.isApproved = true;
      user.inviteToken = undefined;
      user.inviteTokenExpiry = undefined;
      writeDB(db);

      res.json({ message: 'Password set successfully. You can now log in.' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
