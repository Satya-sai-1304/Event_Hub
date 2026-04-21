const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Category = require('../models/Category');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const DB_FILE = path.join(__dirname, '../db.json');

const categoriesToAdd = [
  { name: "Wedding", description: "Wedding events" },
  { name: "Birthday", description: "Birthday parties" },
  { name: "Sports", description: "Sports events" },
  { name: "Festival", description: "Festivals" },
  { name: "Concert", description: "Musical concerts" }
];

async function fixCategories() {
  // Update JSON DB
  try {
    if (fs.existsSync(DB_FILE)) {
      const db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
      if (!db.categories) db.categories = [];
      
      categoriesToAdd.forEach(cat => {
        const exists = db.categories.find(c => c.name === cat.name && (!c.merchantId || c.merchantId === ""));
        if (!exists) {
          db.categories.push({
            ...cat,
            id: String(db.categories.length + 1)
          });
          console.log(`Added category to JSON: ${cat.name}`);
        }
      });
      
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
    }
  } catch (err) {
    console.error("Error updating JSON categories:", err);
  }

  // Update MongoDB
  try {
    if (process.env.MONGODB_URI) {
      await mongoose.connect(process.env.MONGODB_URI);
      console.log("Connected to MongoDB");

      for (const cat of categoriesToAdd) {
        const existing = await Category.findOne({ name: cat.name });
        if (existing) {
          if (existing.merchantId) {
            existing.merchantId = undefined; // Make it global
            await existing.save();
            console.log(`Updated category to global: ${cat.name}`);
          } else {
            console.log(`Category is already global: ${cat.name}`);
          }
        } else {
          await Category.create(cat);
          console.log(`Added category to MongoDB: ${cat.name}`);
        }
      }

      await mongoose.disconnect();
    }
  } catch (err) {
    console.error("Error updating MongoDB categories:", err);
  }
}

fixCategories();
