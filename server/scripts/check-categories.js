/**
 * Diagnostic script to check categories in database
 * Run: node scripts/check-categories.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../models/Category');

const MONGODB_URI = process.env.MONGODB_URI;

async function checkCategories() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found in .env file');
    process.exit(1);
  }

  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all categories
    const allCategories = await Category.find().sort({ createdAt: -1 });
    console.log('📊 Total categories in database:', allCategories.length);
    console.log('');

    if (allCategories.length === 0) {
      console.log('⚠️  No categories found in database!');
      console.log('💡 Create some categories first using the UI');
    } else {
      // Group by merchantId
      const merchantGroups = {};
      allCategories.forEach(cat => {
        const mId = cat.merchantId || 'NO_MERCHANT_ID';
        if (!merchantGroups[mId]) {
          merchantGroups[mId] = [];
        }
        merchantGroups[mId].push(cat);
      });

      console.log('📈 Categories by Merchant:');
      console.log('='.repeat(80));
      
      Object.keys(merchantGroups).forEach((merchantId, index) => {
        const categories = merchantGroups[merchantId];
        console.log(`\n👤 Merchant ${index + 1}: ${merchantId}`);
        console.log(`   Total categories: ${categories.length}`);
        console.log('   Categories:');
        
        categories.forEach((cat, catIndex) => {
          console.log(`   ${catIndex + 1}. Name: "${cat.name}"`);
          console.log(`      ID: ${cat._id}`);
          console.log(`      merchantId: ${cat.merchantId} (type: ${typeof cat.merchantId})`);
          console.log(`      isGlobal: ${cat.isGlobal}`);
          console.log(`      createdAt: ${cat.createdAt}`);
          if (cat.description) {
            console.log(`      description: ${cat.description}`);
          }
          console.log('');
        });
      });

      // Check for potential issues
      console.log('\n🔍 Potential Issues Check:');
      console.log('='.repeat(80));

      // Issue 1: Categories without merchantId
      const noMerchantId = allCategories.filter(c => !c.merchantId);
      if (noMerchantId.length > 0) {
        console.log(`\n⚠️  Found ${noMerchantId.length} categories WITHOUT merchantId:`);
        noMerchantId.forEach(cat => {
          console.log(`   - "${cat.name}" (ID: ${cat._id})`);
        });
      } else {
        console.log('\n✅ All categories have merchantId');
      }

      // Issue 2: Categories with wrong isGlobal flag
      const categoriesWithWrongFlag = allCategories.filter(c => c.isGlobal === true);
      if (categoriesWithWrongFlag.length > 0) {
        console.log(`\n⚠️  Found ${categoriesWithWrongFlag.length} categories with isGlobal=true (should be false):`);
        categoriesWithWrongFlag.forEach(cat => {
          console.log(`   - "${cat.name}" by merchant ${cat.merchantId}`);
        });
        console.log('   💡 These are being treated as Service Types, not Categories!');
      } else {
        console.log('✅ All categories have correct isGlobal=false flag');
      }

      // Issue 3: Type mismatches
      const objectIdTypes = allCategories.filter(c => typeof c.merchantId === 'object');
      if (objectIdTypes.length > 0) {
        console.log(`\n⚠️  Found ${objectIdTypes.length} categories with ObjectId merchantId (should be string):`);
        objectIdTypes.forEach(cat => {
          console.log(`   - "${cat.name}" - merchantId type: ${typeof cat.merchantId}`);
        });
        console.log('   💡 This might cause query mismatches!');
      } else {
        console.log('✅ All merchantIds are strings (correct type)');
      }

      // Issue 4: Duplicate names within same merchant
      console.log('\n🔍 Checking for duplicate category names within merchants:');
      Object.keys(merchantGroups).forEach(merchantId => {
        const categories = merchantGroups[merchantId];
        const nameCounts = {};
        categories.forEach(cat => {
          nameCounts[cat.name] = (nameCounts[cat.name] || 0) + 1;
        });
        
        const duplicates = Object.keys(nameCounts).filter(name => nameCounts[name] > 1);
        if (duplicates.length > 0) {
          console.log(`   ⚠️  Merchant ${merchantId} has duplicates:`);
          duplicates.forEach(name => {
            console.log(`      - "${name}" appears ${nameCounts[name]} times`);
          });
        }
      });
      console.log('   ✅ No duplicates found (or listed above)');
    }

    console.log('\n' + '='.repeat(80));
    console.log('💡 Next Steps:');
    console.log('   1. Check if the merchantId matches the logged-in user ID');
    console.log('   2. Ensure isGlobal is false for categories');
    console.log('   3. Ensure merchantId type is string, not ObjectId');
    console.log('   4. Check browser and server console logs for API calls');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
    process.exit(0);
  }
}

checkCategories();
