const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// الاتصال بقاعدة البيانات
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/munqeth';
    console.log('Connecting to MongoDB:', mongoUri.replace(/\/\/.*@/, '//***@')); // إخفاء credentials
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// إزالة unique index من حقل code
const removeCodeUniqueIndex = async () => {
  try {
    const db = mongoose.connection.db;
    const collection = db.collection('drivers');
    
    // الحصول على جميع الـ indexes
    const indexes = await collection.indexes();
    console.log('\n📋 Current indexes:');
    indexes.forEach((index, i) => {
      console.log(`  ${i + 1}. ${index.name}:`, index.key, index.unique ? '(UNIQUE)' : '');
    });
    
    // البحث عن index على حقل code
    const codeIndex = indexes.find(index => {
      const keys = Object.keys(index.key || {});
      return keys.includes('code') && index.unique;
    });
    
    if (codeIndex) {
      console.log('\n🔍 Found unique index on code field:', codeIndex.name);
      console.log('   Key pattern:', codeIndex.key);
      console.log('   Unique:', codeIndex.unique);
      
      // إزالة الـ index
      try {
        await collection.dropIndex(codeIndex.name);
        console.log('✅ Successfully removed unique index:', codeIndex.name);
      } catch (dropError) {
        // إذا فشل dropIndex بالاسم، نحاول بالـ key pattern
        console.log('⚠️ Failed to drop by name, trying by key pattern...');
        try {
          await collection.dropIndex(codeIndex.key);
          console.log('✅ Successfully removed unique index by key pattern');
        } catch (dropError2) {
          console.error('❌ Failed to drop index:', dropError2.message);
          throw dropError2;
        }
      }
    } else {
      console.log('\nℹ️ No unique index found on code field');
      console.log('   The code field may already allow duplicates');
    }
    
    // التحقق من الـ indexes بعد الإزالة
    console.log('\n📋 Updated indexes:');
    const updatedIndexes = await collection.indexes();
    updatedIndexes.forEach((index, i) => {
      console.log(`  ${i + 1}. ${index.name}:`, index.key, index.unique ? '(UNIQUE)' : '');
    });
    
    console.log('\n✅ Process completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error removing index:', error);
    if (error.code === 27) {
      console.error('   Index not found. It may have already been removed.');
    }
    process.exit(1);
  }
};

// تشغيل السكريبت
(async () => {
  await connectDB();
  await removeCodeUniqueIndex();
})();

