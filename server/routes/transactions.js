const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../db.json');

const readDB = () => {
  if (!fs.existsSync(DB_FILE)) return { transactions: [] };
  const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  if (!data.transactions) data.transactions = [];
  return data;
};

// Get all transactions
router.get('/', async (req, res) => {
  try {
    if (req.useMongoDB) {
      const transactions = await Transaction.find().sort({ createdAt: -1 });
      res.json(transactions);
    } else {
      const db = readDB();
      res.json(db.transactions || []);
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get analytics
router.get('/analytics', async (req, res) => {
  try {
    let transactions = [];
    if (req.useMongoDB) {
      transactions = await Transaction.find();
    } else {
      const db = readDB();
      transactions = db.transactions || [];
    }

    const totalCommissionEarned = transactions.reduce((sum, t) => sum + (t.adminCommission || 0), 0);
    const totalMerchantEarnings = transactions.reduce((sum, t) => sum + (t.merchantEarnings || 0), 0);
    const totalTransactions = transactions.length;

    res.json({
      totalCommissionEarned,
      totalMerchantEarnings,
      totalTransactions,
      recentTransactions: transactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
