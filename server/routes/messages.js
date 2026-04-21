const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Message = require('../models/Message');
const Notification = require('../models/Notification');

const DB_FILE = path.join(__dirname, '..', 'db.json');

// Get all messages for a user (either sender or receiver)
router.get('/', async (req, res) => {
  const userId = req.query.userId;
  if (!userId) {
    return res.status(400).json({ message: 'UserId is required' });
  }

  try {
    if (req.useMongoDB) {
      const messages = await Message.find({
        $or: [{ senderId: userId }, { receiverId: userId }]
      }).sort({ createdAt: -1 });
      res.json(messages);
    } else {
      const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      const messages = (db.messages || []).filter(m => 
        String(m.senderId) === String(userId) || String(m.receiverId) === String(userId)
      ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      res.json(messages);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new message
router.post('/', async (req, res) => {
  const { senderId, receiverId, senderName, senderEmail, message, eventId, eventTitle } = req.body;

  if (!senderId || !receiverId || !message) {
    return res.status(400).json({ message: 'SenderId, receiverId, and message are required' });
  }

  try {
    let newMessage;
    if (req.useMongoDB) {
      newMessage = new Message({
        senderId,
        receiverId,
        senderName,
        senderEmail,
        message,
        eventId,
        eventTitle,
        createdAt: new Date()
      });
      await newMessage.save();

      // Create notification for receiver
      const notification = new Notification({
        userId: receiverId,
        type: 'message',
        title: 'New Message',
        message: `You have a new message from ${senderName}: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`,
        actionUrl: '/dashboard/messages', // Assuming a messages dashboard exists
        createdAt: new Date()
      });
      await notification.save();

      // Emit notification via socket
      if (req.io) {
        req.io.to(receiverId.toString()).emit('receive_notification', notification);
      }
    } else {
      const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      if (!db.messages) db.messages = [];
      if (!db.notifications) db.notifications = [];

      newMessage = {
        _id: new mongoose.Types.ObjectId().toString(),
        senderId,
        receiverId,
        senderName,
        senderEmail,
        message,
        eventId,
        eventTitle,
        isRead: false,
        createdAt: new Date()
      };
      db.messages.push(newMessage);

      const notification = {
        _id: new mongoose.Types.ObjectId().toString(),
        userId: receiverId,
        type: 'message',
        title: 'New Message',
        message: `You have a new message from ${senderName}: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"`,
        actionUrl: '/dashboard/messages',
        createdAt: new Date()
      };
      db.notifications.push(notification);

      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');

      // Emit notification via socket
      if (req.io) {
        req.io.to(receiverId.toString()).emit('receive_notification', notification);
      }
    }
    res.status(201).json(newMessage);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mark message as read
router.patch('/:id/read', async (req, res) => {
  try {
    if (req.useMongoDB) {
      const updatedMessage = await Message.findByIdAndUpdate(
        req.params.id,
        { isRead: true },
        { new: true }
      );
      res.json(updatedMessage);
    } else {
      const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      const index = db.messages.findIndex(m => String(m._id) === String(req.params.id));
      if (index !== -1) {
        db.messages[index].isRead = true;
        fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
        res.json(db.messages[index]);
      } else {
        res.status(404).json({ message: 'Message not found' });
      }
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
