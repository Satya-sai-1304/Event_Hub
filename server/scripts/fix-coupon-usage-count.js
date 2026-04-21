/**
 * MongoDB Migration Script - Fix Coupon usageCount Type
 * 
 * Purpose: Convert any usageCount fields stored as strings to Numbers
 * Run this ONCE to clean up existing wrong data
 * 
 * Usage: node scripts/fix-coupon-usage-count.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Coupon = require('../models/Coupon');

async function fixCouponUsageCount() {
  try {
    console.log('🔍 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/event-hub');
    console.log('✅ Connected to MongoDB');

    // Check for coupons with usageCount as string
    console.log('\n📊 Checking for coupons with wrong usageCount type...');
    const stringUsageCoupons = await Coupon.find({ 
      usageCount: { $type: 'string' } 
    });

    console.log(`Found ${stringUsageCoupons.length} coupons with usageCount as string`);

    if (stringUsageCoupons.length > 0) {
      console.log('\n⚠️  WRONG DATA FOUND! Fixing...\n');
      
      // Show affected coupons
      stringUsageCoupons.forEach(coupon => {
        console.log(`- ${coupon.couponCode}: usageCount = "${coupon.usageCount}" (string)`);
      });

      // Fix: Update all coupons with string usageCount to number
      console.log('\n🔧 Running migration...\n');
      const result = await Coupon.updateMany(
        { usageCount: { $type: 'string' } },
        [
          {
            $set: {
              usageCount: { $toDouble: '$usageCount' }
            }
          }
        ]
      );

      console.log(`✅ Successfully updated ${result.modifiedCount} coupons\n`);

      // Verify the fix
      const stillWrong = await Coupon.find({ 
        usageCount: { $type: 'string' } 
      });
      
      if (stillWrong.length === 0) {
        console.log('✅ VERIFICATION PASSED: No more string usageCount values\n');
      } else {
        console.log('❌ VERIFICATION FAILED: Some coupons still have wrong type\n');
      }

    } else {
      console.log('\n✅ NO ACTION NEEDED: All coupons have correct usageCount type\n');
    }

    // Also verify usageLimit is properly set
    console.log('\n📊 Verifying usageLimit field types...');
    const nullUsageLimit = await Coupon.countDocuments({ usageLimit: null });
    const validUsageLimit = await Coupon.countDocuments({ 
      usageLimit: { $ne: null } 
    });

    console.log(`Coupons with null usageLimit: ${nullUsageLimit}`);
    console.log(`Coupons with valid usageLimit: ${validUsageLimit}`);

    // Final summary
    console.log('\n📋 FINAL SUMMARY:');
    const totalCoupons = await Coupon.countDocuments();
    const activeCoupons = await Coupon.countDocuments({ isActive: true });
    const expiredCoupons = await Coupon.countDocuments({ 
      expiryDate: { $lt: new Date() } 
    });

    console.log(`Total Coupons: ${totalCoupons}`);
    console.log(`Active Coupons: ${activeCoupons}`);
    console.log(`Expired Coupons: ${expiredCoupons}`);
    console.log(`Coupons with usage limit: ${validUsageLimit}`);
    console.log(`Coupons without usage limit: ${nullUsageLimit}`);

    console.log('\n✅ Migration completed successfully!\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run the migration
fixCouponUsageCount();
