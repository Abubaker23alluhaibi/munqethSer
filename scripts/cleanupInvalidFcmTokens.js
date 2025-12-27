/**
 * Script to clean up invalid FCM tokens from database
 * This script validates all FCM tokens and removes invalid ones
 * 
 * Usage: node scripts/cleanupInvalidFcmTokens.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const admin = require('firebase-admin');
const User = require('../models/User');
const Driver = require('../models/Driver');

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
    console.log('✅ Firebase Admin initialized');
  } catch (error) {
    console.error('❌ Error initializing Firebase Admin:', error.message);
    process.exit(1);
  }
}

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/munqeth';
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    cleanupInvalidTokens();
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  });

/**
 * Validate a single FCM token by trying to send a test message
 */
async function validateToken(token) {
  try {
    // Try to get token info (lightweight validation)
    // Note: Firebase Admin doesn't have a direct validate token API,
    // so we'll try to send a test message
    const message = {
      token: token,
      notification: {
        title: 'Test',
        body: 'Test',
      },
      // Set dry_run to true - this validates without actually sending
      dryRun: true,
    };
    
    await admin.messaging().send(message);
    return true;
  } catch (error) {
    if (error.code === 'messaging/invalid-registration-token' || 
        error.code === 'messaging/registration-token-not-registered') {
      return false;
    }
    // Other errors might be temporary, consider valid
    return true;
  }
}

/**
 * Clean up invalid FCM tokens from database
 */
async function cleanupInvalidTokens() {
  console.log('\n🧹 Starting cleanup of invalid FCM tokens...\n');
  
  let usersCleaned = 0;
  let driversCleaned = 0;
  
  try {
    // Get all users with FCM tokens
    const users = await User.find({ fcmToken: { $exists: true, $ne: null, $ne: '' } });
    console.log(`📱 Found ${users.length} users with FCM tokens`);
    
    // Validate each user token
    for (const user of users) {
      if (user.fcmToken) {
        const isValid = await validateToken(user.fcmToken);
        if (!isValid) {
          console.log(`❌ Invalid token for user ${user.name} (${user.phone}): ${user.fcmToken.substring(0, 20)}...`);
          await User.updateOne(
            { _id: user._id },
            { $unset: { fcmToken: '' }, $set: { updatedAt: new Date() } }
          );
          usersCleaned++;
        }
      }
    }
    
    // Get all drivers with FCM tokens
    const drivers = await Driver.find({ fcmToken: { $exists: true, $ne: null, $ne: '' } });
    console.log(`🚗 Found ${drivers.length} drivers with FCM tokens`);
    
    // Validate each driver token
    for (const driver of drivers) {
      if (driver.fcmToken) {
        const isValid = await validateToken(driver.fcmToken);
        if (!isValid) {
          console.log(`❌ Invalid token for driver ${driver.name} (${driver.driverId}): ${driver.fcmToken.substring(0, 20)}...`);
          await Driver.updateOne(
            { _id: driver._id },
            { $unset: { fcmToken: '' }, $set: { updatedAt: new Date() } }
          );
          driversCleaned++;
        }
      }
    }
    
    console.log('\n✅ Cleanup complete!');
    console.log(`   - Users cleaned: ${usersCleaned}`);
    console.log(`   - Drivers cleaned: ${driversCleaned}`);
    console.log(`   - Total cleaned: ${usersCleaned + driversCleaned}\n`);
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
}

