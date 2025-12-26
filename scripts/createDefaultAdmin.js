/**
 * سكريبت لإنشاء admin افتراضي في قاعدة البيانات
 * استخدم: node backend/scripts/createDefaultAdmin.js
 */

const mongoose = require('mongoose');
const Admin = require('../models/Admin');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://munqeth7899:4NWuDr0AidjkmA1F@cluster0.knb2qgu.mongodb.net/munqeth?retryWrites=true&w=majority&appName=Cluster0';

async function createDefaultAdmin() {
  try {
    // الاتصال بقاعدة البيانات
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // التحقق من وجود admin بالكود ADMIN001
    const existingAdmin = await Admin.findOne({ code: 'ADMIN001' });
    
    if (existingAdmin) {
      console.log('ℹ️  Admin with code ADMIN001 already exists');
      console.log('   ID:', existingAdmin._id);
      console.log('   Code:', existingAdmin.code);
      console.log('   Name:', existingAdmin.name);
      
      // تحديث admin الموجود لإضافة password إذا لم يكن موجوداً
      if (!existingAdmin.password) {
        existingAdmin.password = 'admin123';
        await existingAdmin.save();
        console.log('✅ Updated admin with password: admin123');
      } else {
        console.log('   Password:', existingAdmin.password);
      }
      
      await mongoose.disconnect();
      return;
    }

    // إنشاء admin جديد
    const admin = new Admin({
      code: 'ADMIN001',
      password: 'admin123',
      name: 'مدير النظام',
      email: 'admin@munqeth.com',
      phone: '07700000000',
    });

    await admin.save();
    console.log('✅ Default admin created successfully!');
    console.log('   ID:', admin._id);
    console.log('   Code: ADMIN001');
    console.log('   Password: admin123');
    console.log('\n📝 يمكنك الآن تسجيل الدخول باستخدام:');
    console.log('   ID: ADMIN001');
    console.log('   Code: admin123');

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createDefaultAdmin();

