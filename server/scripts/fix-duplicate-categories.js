const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/event_hub')
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

const Category = require('./models/Category');

async function fixDuplicateCategories() {
  try {
    console.log('Starting to fix duplicate categories...');
    
    // Drop the old unique index if it exists
    try {
      await Category.collection.dropIndex('name_1');
      console.log('✓ Dropped old unique index: name_1');
    } catch (err) {
      console.log('ℹ Index name_1 does not exist, skipping...');
    }
    
    // Find duplicates and remove them (keep the first one)
    const duplicates = await Category.aggregate([
      {
        $group: {
          _id: { name: '$name', merchantId: '$merchantId' },
          count: { $sum: 1 },
          ids: { $push: '$_id' }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);
    
    if (duplicates.length === 0) {
      console.log('✓ No duplicate categories found');
    } else {
      console.log(`Found ${duplicates.length} duplicate groups`);
      
      for (const dup of duplicates) {
        console.log(`\nDuplicate: name="${dup._id.name}", merchantId="${dup._id.merchantId || 'null'}"`);
        console.log(`  Count: ${dup.count}, IDs: ${dup.ids.join(', ')}`);
        
        // Keep the first one, delete the rest
        const idsToDelete = dup.ids.slice(1);
        await Category.deleteMany({ _id: { $in: idsToDelete } });
        console.log(`  ✓ Deleted ${idsToDelete.length} duplicate(s)`);
      }
    }
    
    // Create new compound index
    try {
      await Category.collection.createIndex(
        { name: 1, merchantId: 1 },
        { unique: true, sparse: true }
      );
      console.log('✓ Created new compound index: { name: 1, merchantId: 1 }');
    } catch (err) {
      console.error('✗ Failed to create new index:', err.message);
    }
    
    // Create partial index for global categories
    try {
      await Category.collection.createIndex(
        { name: 1, isGlobal: 1 },
        { unique: true, partialFilterExpression: { isGlobal: true } }
      );
      console.log('✓ Created partial index for global categories');
    } catch (err) {
      console.error('✗ Failed to create global index:', err.message);
    }
    
    console.log('\n✅ Duplicate category fix completed!');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error:', err);
    process.exit(1);
  }
}

fixDuplicateCategories();
