require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const passport = require('passport');
const session = require('express-session');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5000;
const DB_FILE = path.join(__dirname, 'db.json');

// Socket.io connection
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  socket.on('send_notification', (data) => {
    io.to(data.userId).emit('receive_notification', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-role', 'x-user-id']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

let useMongoDB = false;

// Database connection
const MONGODB_URI = process.env.MONGODB_URI;

const connectDB = async () => {
  if (MONGODB_URI) {
    try {
      console.log('Attempting to connect to MongoDB...');
      // Use more robust connection options
      await mongoose.connect(MONGODB_URI, { 
        serverSelectionTimeoutMS: 5000, // Reduced timeout for faster fallback
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
      });
      console.log('Successfully connected to MongoDB!');
      useMongoDB = true;
    } catch (err) {
      console.error('MongoDB Connection Failed:');
      console.error(`- Error Message: ${err.message}`);
      
      if (err.message.includes('IP address is not whitelisted')) {
        console.warn('ACTION REQUIRED: Please whitelist your IP in MongoDB Atlas (Network Access).');
      } else if (err.message.includes('Authentication failed')) {
        console.warn('ACTION REQUIRED: Please check your MongoDB username and password in .env.');
      }
      
      console.warn('Switching to local JSON file database (db.json) as fallback...');
      useMongoDB = false;
    }
  } else {
    console.warn('MONGODB_URI not found in .env, using JSON file database');
    useMongoDB = false;
  }

  if (!useMongoDB) {
    if (!fs.existsSync(DB_FILE)) {
      console.log('Initializing local database file...');
      fs.writeFileSync(DB_FILE, JSON.stringify({ events: [], bookings: [], users: [], transactions: [], notifications: [] }, null, 2), 'utf8');
    }
    console.log(`Using JSON file database at ${DB_FILE}`);
  }
};

connectDB();

// Routes
const eventsRouter = require('./routes/events');
const bookingRoutes = require('./routes/bookings');
const usersRouter = require('./routes/users');
const merchantsRouter = require('./routes/merchants');
const notificationsRouter = require('./routes/notifications');
const savedEventsRouter = require('./routes/saved-events');
const galleryRouter = require('./routes/gallery');
const reviewsRouter = require('./routes/reviews');
const decorationsRouter = require('./routes/decorations');
const categoriesRouter = require('./routes/categories');
const serviceTypesRouter = require('./routes/service-types');
const ticketsRouter = require('./routes/tickets');
const servicesRouter = require('./routes/services');
const complaintsRouter = require('./routes/complaints');
const transactionsRouter = require('./routes/transactions');
const authRouter = require('./routes/auth');
const couponsRouter = require('./routes/coupons');
const bannersRouter = require('./routes/banners');
const auditLogsRouter = require('./routes/audit-logs');
const settingsRouter = require('./routes/settings');
const messagesRouter = require('./routes/messages');
const paymentRouter = require('./routes/payment');

// Inject io into request and populate req.user from headers if missing
app.use(async (req, res, next) => {
  req.useMongoDB = useMongoDB;
  req.io = io;

  // If req.user is missing (e.g. not social auth), try to populate from headers
  if (!req.user && req.headers['x-user-id']) {
    try {
      const userId = req.headers['x-user-id'];
      if (useMongoDB) {
        const User = require('./models/User');
        const user = await User.findById(userId);
        if (user) {
          req.user = user;
        }
      } else {
        const db = JSON.parse(fs.readFileSync(path.join(__dirname, 'db.json'), 'utf8'));
        const user = db.users.find(u => u.id === userId || u._id === userId);
        if (user) {
          req.user = user;
        }
      }
    } catch (err) {
      console.error('Error populating user from headers:', err);
    }
  }
  next();
});

app.use('/api/auth', authRouter);
app.use('/api/coupons', couponsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/bookings', bookingRoutes);
app.use('/api/users', usersRouter);
app.use('/api/merchants', merchantsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/saved-events', savedEventsRouter);
app.use('/api/gallery', galleryRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/decorations', decorationsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/service-types', serviceTypesRouter);
app.use('/api/tickets', ticketsRouter);
app.use('/api/services', servicesRouter);
app.use('/api/complaints', complaintsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/banners', bannersRouter);
app.use('/api/audit-logs', auditLogsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/messages', messagesRouter);
app.use('/api/payment', paymentRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    database: useMongoDB ? 'mongodb' : 'json-file',
    connection: useMongoDB ? (mongoose.connection.readyState === 1 ? 'connected' : 'disconnected') : 'n/a'
  });
});

// Start server
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`Error: Port ${PORT} is already in use. Please terminate the process using this port or choose a different port in your .env file.`);
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Periodic check for completed events to send rating notifications
  setInterval(async () => {
    try {
      const now = new Date();
      if (useMongoDB) {
        const Booking = require('./models/Booking');
        const Notification = require('./models/Notification');
        
        const completedBookings = await Booking.find({
          eventDate: { $lt: now },
          status: 'confirmed',
          isRated: { $ne: true }
        });

        for (const booking of completedBookings) {
          // Check if notification already exists
          const existingNotif = await Notification.findOne({
            userId: booking.customerId,
            bookingId: booking._id,
            type: 'reminder',
            title: 'Rate your experience'
          });

          if (!existingNotif) {
            await Notification.create({
              userId: booking.customerId,
              type: 'reminder',
              title: 'Rate your experience',
              message: `Your event "${booking.eventTitle}" is completed. Please rate your experience!`,
              bookingId: booking._id,
              actionUrl: `/dashboard/my-bookings?rate=${booking._id}`
            });
            console.log(`Rating notification sent to user ${booking.customerId} for booking ${booking._id}`);
          }
        }
      } else {
        const DB_FILE = path.join(__dirname, 'db.json');
        if (fs.existsSync(DB_FILE)) {
          const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
          if (db.bookings && db.notifications) {
            let updated = false;
            db.bookings.forEach(booking => {
              if (new Date(booking.eventDate) < now && booking.status === 'confirmed' && !booking.isRated) {
                const existingNotif = db.notifications.find(n => 
                  n.userId === booking.customerId && 
                  n.bookingId === booking.id && 
                  n.type === 'reminder'
                );

                if (!existingNotif) {
                  const { v4: uuidv4 } = require('uuid');
                  db.notifications.push({
                    id: uuidv4(),
                    userId: booking.customerId,
                    type: 'reminder',
                    title: 'Rate your experience',
                    message: `Your event "${booking.eventTitle}" is completed. Please rate your experience!`,
                    bookingId: booking.id,
                    actionUrl: `/dashboard/my-bookings?rate=${booking.id}`,
                    isRead: false,
                    createdAt: new Date().toISOString()
                  });
                  updated = true;
                  console.log(`Rating notification added to db.json for user ${booking.customerId}`);
                }
              }
            });
            if (updated) {
              fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
            }
          }
        }
      }
    } catch (err) {
      console.error('Error in completed events check:', err);
    }
  }, 1000 * 60 * 60); // Check every hour
});

// Handle errors
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});
