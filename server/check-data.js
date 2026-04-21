const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

async function checkData() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const User = require('./models/User');
    const Event = require('./models/Event');
    
    const userCount = await User.countDocuments();
    const eventCount = await Event.countDocuments();
    
    console.log(`Users in DB: ${userCount}`);
    console.log(`Events in DB: ${eventCount}`);
    
    if (userCount > 0) {
      const users = await User.find().limit(5);
      console.log('Sample Users:', users.map(u => u.email));
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkData();
