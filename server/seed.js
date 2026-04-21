require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Event = require('./models/Event');
const Booking = require('./models/Booking');
const User = require('./models/User');
const Category = require('./models/Category');
const Service = require('./models/Service');

const DB_FILE = path.join(__dirname, 'db.json');

const categories = [
  { name: "Wedding", description: "Marriage ceremonies and receptions" },
  { name: "Birthday", description: "Birthday parties and celebrations" },
  { name: "Concert", description: "Music performances and live shows" },
  { name: "Sports", description: "Athletic events and competitions" },
  { name: "Corporate", description: "Business meetings and conferences" }
];

const initialServices = [
  { name: "Royal Palace Theme", type: "Decoration", price: 8000, description: "Luxurious royal stage setup with flowers and lighting", image: "https://images.unsplash.com/photo-1519225421980-715cb0202128?w=800" },
  { name: "Floral Fantasy", type: "Decoration", price: 5000, description: "Modern floral decoration with elegant stage setup", image: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800" },
  { name: "Premium Veg Buffet", type: "Catering", price: 250, description: "Full course veg menu with 2 starters, 3 main course, and 2 desserts", foodType: "Veg" },
  { name: "Royal Non-Veg Feast", type: "Catering", price: 450, description: "Exotic non-veg menu with kebabs, biryani and royal desserts", foodType: "Non Veg" },
  { name: "Professional DJ", type: "Music", price: 10000, description: "Top-rated DJ with premium sound system and dance floor", image: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800" },
  { name: "Live Acoustic Band", type: "Music", price: 15000, description: "4-piece live band for a classy musical experience", image: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=800" },
  { name: "Ambient LED Lighting", type: "Lighting", price: 5000, description: "Dynamic LED wash lights and spotlighting for the entire venue", image: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800" },
  { name: "Grand Stage Lighting", type: "Lighting", price: 8000, description: "Professional stage lighting with smoke machine and moving heads", image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800" },
];

const adminUser = {
  name: "System Admin",
  email: "admin@gmail.com",
  password: "admin@123",
  role: "admin",
  isApproved: true,
  createdAt: new Date().toISOString()
};

const seedJSON = () => {
  const db = {
    events: [],
    users: [{ ...adminUser, id: "1" }],
    bookings: [],
    categories: categories.map((c, i) => ({ ...c, id: String(i + 1) })),
    services: initialServices.map((s, i) => ({ ...s, id: String(i + 1), isActive: true }))
  };
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  console.log('JSON file reset successfully (Admin, Categories & Services remain)!');
};

const seedMongoDB = async () => {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.log('MONGODB_URI not found, skipping MongoDB reset');
    return;
  }

  try {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('Connected to MongoDB for data reset...');
    
    await Event.deleteMany({});
    await User.deleteMany({});
    await Booking.deleteMany({});
    await Category.deleteMany({});
    await Service.deleteMany({});

    await User.create(adminUser);
    console.log(`Initialized Admin user in MongoDB: admin@gmail.com`);

    await Category.insertMany(categories);
    console.log(`Initialized ${categories.length} categories in MongoDB`);

    await Service.insertMany(initialServices);
    console.log(`Initialized ${initialServices.length} services in MongoDB`);

    console.log('MongoDB reset successfully (Admin, Categories & Services remain)!');
    await mongoose.disconnect();
  } catch (err) {
    console.error('MongoDB reset error:', err.message);
  }
};

const runSeed = async () => {
  seedJSON();
  await seedMongoDB();
  process.exit(0);
};

runSeed();
