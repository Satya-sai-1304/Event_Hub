const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const User = require('../models/User');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DB_FILE = path.join(__dirname, '../db.json');

const readDB = () => {
  if (!fs.existsSync(DB_FILE)) return { notifications: [] };
  const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  if (!data.notifications) data.notifications = [];
  return data;
};

const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');

// Get all notifications for a user
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    if (req.useMongoDB) {
      const notifications = await Notification.find({ userId })
        .sort({ createdAt: -1 })
        .limit(50);
      return res.json(notifications);
    } else {
      const db = readDB();
      const notifications = db.notifications
        .filter(n => n.userId === userId)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 50);
      return res.json(notifications);
    }
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Server error fetching notifications' });
  }
});

// Mark notification as read
router.patch('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (req.useMongoDB) {
      const notification = await Notification.findByIdAndUpdate(
        id,
        { isRead: true },
        { new: true }
      );
      
      if (!notification) {
        return res.status(404).json({ message: 'Notification not found' });
      }
      
      return res.json(notification);
    } else {
      const db = readDB();
      const index = db.notifications.findIndex(n => n.id === id);
      
      if (index === -1) {
        return res.status(404).json({ message: 'Notification not found' });
      }
      
      db.notifications[index].isRead = true;
      writeDB(db);
      return res.json(db.notifications[index]);
    }
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Server error updating notification' });
  }
});

// Mark all notifications as read for a user
router.patch('/read-all', async (req, res) => {
  try {
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    if (req.useMongoDB) {
      await Notification.updateMany(
        { userId, isRead: false },
        { isRead: true }
      );
    } else {
      const db = readDB();
      db.notifications.forEach(n => {
        if (n.userId === userId) n.isRead = true;
      });
      writeDB(db);
    }
    
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Server error updating notifications' });
  }
});

// Create a new notification
router.post('/', async (req, res) => {
  try {
    const { userId, type, title, message, bookingId, eventId, actionUrl } = req.body;
    
    if (!userId || !type || !title || !message) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    if (req.useMongoDB) {
      const notification = await Notification.create({
        userId,
        type,
        title,
        message,
        bookingId,
        eventId,
        actionUrl
      });
      return res.status(201).json(notification);
    } else {
      const db = readDB();
      const notification = {
        id: uuidv4(),
        userId,
        type,
        title,
        message,
        bookingId,
        eventId,
        actionUrl,
        isRead: false,
        createdAt: new Date().toISOString()
      };
      db.notifications.push(notification);
      writeDB(db);
      return res.status(201).json(notification);
    }
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ message: 'Server error creating notification' });
  }
});

// Delete a notification
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (req.useMongoDB) {
      const notification = await Notification.findByIdAndDelete(id);
      if (!notification) {
        return res.status(404).json({ message: 'Notification not found' });
      }
    } else {
      const db = readDB();
      const initialLength = db.notifications.length;
      db.notifications = db.notifications.filter(n => n.id !== id);
      if (db.notifications.length === initialLength) {
        return res.status(404).json({ message: 'Notification not found' });
      }
      writeDB(db);
    }
    
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ message: 'Server error deleting notification' });
  }
});

// Broadcast notification (Admin)
router.post('/broadcast', async (req, res) => {
  const { target, type, title, message, actionUrl } = req.body;
  
  if (!target || !type || !title || !message) {
    return res.status(400).json({ message: 'Missing required fields: target, type, title, message' });
  }

  try {
    let users = [];
    if (req.useMongoDB) {
      if (target === 'all') {
        users = await User.find({}, '_id');
      } else if (target === 'customers') {
        users = await User.find({ role: 'customer' }, '_id');
      } else if (target === 'merchants') {
        users = await User.find({ role: 'organizer' }, '_id');
      }

      const notifications = users.map(user => ({
        userId: user._id,
        type,
        title,
        message,
        actionUrl
      }));

      await Notification.insertMany(notifications);
    } else {
      const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      if (target === 'all') {
        users = db.users;
      } else if (target === 'customers') {
        users = db.users.filter(u => u.role === 'customer');
      } else if (target === 'merchants') {
        users = db.users.filter(u => u.role === 'organizer');
      }

      if (!db.notifications) db.notifications = [];
      
      users.forEach(user => {
        db.notifications.push({
          id: uuidv4(),
          userId: user.id,
          type,
          title,
          message,
          actionUrl,
          isRead: false,
          createdAt: new Date().toISOString()
        });
      });
      writeDB(db);
    }

    // If socket.io is available, broadcast to all
    if (req.io) {
      req.io.emit('receive_broadcast', { type, title, message, actionUrl });
    }

    res.json({ message: `Broadcasted to ${users.length} users` });
  } catch (error) {
    console.error('Error broadcasting notification:', error);
    res.status(500).json({ message: 'Server error broadcasting notification' });
  }
});

// Create notification for merchant when customer contacts them
router.post('/contact-merchant', async (req, res) => {
  try {
    const { merchantId, customerId, customerName, customerEmail, message } = req.body;

    if (!merchantId || !customerName || !message) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const notificationTitle = `New Inquiry from ${customerName} 📩`;
    const notificationMessage = `You have a new inquiry from ${customerName} (${customerEmail}): "${message}"`;

    if (req.useMongoDB) {
      const notification = await Notification.create({
        userId: merchantId,
        type: 'message',
        title: notificationTitle,
        message: notificationMessage,
        isRead: false,
        createdAt: new Date()
      });

      // Send real-time notification
      if (req.io) {
        req.io.to(merchantId).emit('receive_notification', {
          id: notification._id,
          type: 'message',
          title: notificationTitle,
          message: notificationMessage,
          createdAt: notification.createdAt
        });
      }

      res.status(201).json(notification);
    } else {
      const db = readDB();
      if (!db.notifications) db.notifications = [];
      
      const newNotification = {
        id: uuidv4(),
        userId: merchantId,
        type: 'message',
        title: notificationTitle,
        message: notificationMessage,
        isRead: false,
        createdAt: new Date().toISOString()
      };
      
      db.notifications.push(newNotification);
      writeDB(db);

      // Send real-time notification
      if (req.io) {
        req.io.to(merchantId).emit('receive_notification', newNotification);
      }

      res.status(201).json(newNotification);
    }
  } catch (error) {
    console.error('Error creating contact notification:', error);
    res.status(500).json({ message: 'Server error sending message' });
  }
});

module.exports = router;
