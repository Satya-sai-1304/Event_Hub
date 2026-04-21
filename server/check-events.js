const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;

async function checkEvents() {
  try {
    await mongoose.connect(MONGODB_URI);
    const Event = require('./models/Event');
    const events = await Event.find();
    console.log('Event Titles:', events.map(e => e.title));
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkEvents();
