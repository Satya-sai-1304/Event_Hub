const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/event_hub';

async function fixIndices() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');

    const collections = [
      { name: 'categories', modelName: 'Category', indexName: 'name_1' },
      { name: 'services', modelName: 'Service', indexName: 'name_1' }
    ];

    for (const collInfo of collections) {
      console.log(`\nChecking collection: ${collInfo.name}`);
      const collection = mongoose.connection.collection(collInfo.name);
      
      try {
        const indices = await collection.indexes();
        const hasGlobalIndex = indices.some(idx => idx.name === collInfo.indexName);
        
        if (hasGlobalIndex) {
          console.log(`- Dropping global unique index "${collInfo.indexName}"...`);
          await collection.dropIndex(collInfo.indexName);
          console.log(`- Successfully dropped "${collInfo.indexName}".`);
        } else {
          console.log(`- Global unique index "${collInfo.indexName}" not found.`);
        }

        console.log(`- Creating composite unique index { name: 1, merchantId: 1 }...`);
        await collection.createIndex({ name: 1, merchantId: 1 }, { unique: true });
        console.log(`- Successfully created composite index.`);

      } catch (err) {
        console.error(`- Error processing ${collInfo.name}:`, err.message);
      }
    }

    console.log('\n✅ Indices fix completed!');
    process.exit(0);
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

fixIndices();
