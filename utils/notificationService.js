const admin = require('../config/firebase');
const logger = require('./logger');
const User = require('../models/User');
const Driver = require('../models/Driver');

/**
 * Check if Firebase is initialized
 */
function isFirebaseInitialized() {
  try {
    return admin.apps.length > 0 && admin.messaging;
  } catch (error) {
    return false;
  }
}

/**
 * Remove invalid FCM token from database
 * Supports both array and string fcmToken fields (backwards compatibility)
 * @param {string} fcmToken - Invalid FCM token to remove
 */
async function removeInvalidToken(fcmToken) {
  try {
    let userModifiedCount = 0;
    let driverModifiedCount = 0;
    
    // Remove token from Users (handle both array and string types)
    const users = await User.find({
      $or: [
        { fcmToken: fcmToken }, // old string format
        { fcmToken: { $in: [fcmToken] } } // array format
      ]
    });
    
    for (const user of users) {
      // Normalize to array
      let tokens = Array.isArray(user.fcmToken) ? user.fcmToken : (user.fcmToken ? [user.fcmToken] : []);
      const originalLength = tokens.length;
      
      // Remove the invalid token
      tokens = tokens.filter(token => token !== fcmToken);
      
      if (tokens.length !== originalLength) {
        user.fcmToken = tokens.length > 0 ? tokens : [];
        user.updatedAt = new Date();
        await user.save();
        userModifiedCount++;
      }
    }
    
    // Remove token from Drivers (handle both array and string types)
    const drivers = await Driver.find({
      $or: [
        { fcmToken: fcmToken }, // old string format
        { fcmToken: { $in: [fcmToken] } } // array format
      ]
    });
    
    for (const driver of drivers) {
      // Normalize to array
      let tokens = Array.isArray(driver.fcmToken) ? driver.fcmToken : (driver.fcmToken ? [driver.fcmToken] : []);
      const originalLength = tokens.length;
      
      // Remove the invalid token
      tokens = tokens.filter(token => token !== fcmToken);
      
      if (tokens.length !== originalLength) {
        driver.fcmToken = tokens.length > 0 ? tokens : [];
        driver.updatedAt = new Date();
        await driver.save();
        driverModifiedCount++;
      }
    }
    
    if (userModifiedCount > 0 || driverModifiedCount > 0) {
      logger.warn(`🧹 Removed invalid FCM token (${fcmToken.substring(0, 20)}...) from ${userModifiedCount} user(s) and ${driverModifiedCount} driver(s)`);
      return true;
    }
    
    return false;
  } catch (error) {
    logger.error('Error removing invalid FCM token from database:', error);
    return false;
  }
}

/**
 * Send push notification to a device
 * @param {string} fcmToken - FCM token of the device
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data
 */
async function sendNotification(fcmToken, title, body, data = {}) {
  if (!fcmToken) {
    logger.warn('No FCM token provided - notification not sent');
    return null;
  }

  if (!isFirebaseInitialized()) {
    logger.warn('Firebase not initialized - notification not sent');
    logger.warn('Check if FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL are set');
    return null;
  }

  try {
    // Convert all data values to strings (FCM requirement)
    const stringifiedData = {};
    for (const [key, value] of Object.entries(data)) {
      stringifiedData[key] = String(value);
    }
    
    const message = {
      notification: {
        title,
        body,
      },
      data: {
        ...stringifiedData,
        timestamp: new Date().toISOString(),
      },
      token: fcmToken,
    };

    logger.debug(`Sending notification to token: ${fcmToken.substring(0, 20)}...`);
    logger.debug(`Title: ${title}, Body: ${body}`);
    
    const response = await admin.messaging().send(message);
    logger.success('Notification sent successfully:', response);
    return response;
  } catch (error) {
    logger.error('Error sending notification:', error);
    logger.error('Error code:', error.code);
    logger.error('Error message:', error.message);
    
    // Handle specific Firebase errors
    if (error.code === 'messaging/invalid-registration-token' || 
        error.code === 'messaging/registration-token-not-registered') {
      logger.warn(`Invalid or expired FCM token (${fcmToken.substring(0, 20)}...) - removing from database`);
      // Remove invalid token from database (wait for it to complete)
      await removeInvalidToken(fcmToken);
    } else if (error.code === 'messaging/invalid-argument') {
      logger.warn('Invalid message format');
    }
    
    throw error;
  }
}

/**
 * Send notification to multiple devices
 * Uses individual sendNotification calls instead of sendMulticast to avoid Firebase API issues
 * @param {string[]} fcmTokens - Array of FCM tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data
 */
async function sendMulticastNotification(fcmTokens, title, body, data = {}) {
  if (!fcmTokens || fcmTokens.length === 0) {
    logger.warn('No FCM tokens provided - notifications not sent');
    return null;
  }

  // Filter out null/undefined tokens
  const validTokens = fcmTokens.filter(token => token && token.trim().length > 0);
  if (validTokens.length === 0) {
    logger.warn('No valid FCM tokens provided - notifications not sent');
    return null;
  }

  if (validTokens.length < fcmTokens.length) {
    logger.warn(`Filtered out ${fcmTokens.length - validTokens.length} invalid tokens`);
  }

  if (!isFirebaseInitialized()) {
    logger.warn('Firebase not initialized - notifications not sent');
    logger.warn('Check if FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL are set');
    return null;
  }

  logger.debug(`Sending notifications to ${validTokens.length} devices (using individual sends)`);
  logger.debug(`Title: ${title}, Body: ${body}`);

  // Send notifications individually to avoid Firebase multicast API issues
  let successCount = 0;
  let failureCount = 0;
  const errors = [];

  // Send notifications in parallel but handle errors individually
  const sendPromises = validTokens.map(async (token) => {
    try {
      const result = await sendNotification(token, title, body, data);
      return { success: result !== null, token };
    } catch (error) {
      errors.push({ token: token.substring(0, 20) + '...', error: error.message });
      logger.error(`Failed to send to token ${token.substring(0, 20)}...:`, error.code || 'unknown', error.message);
      
      // Remove invalid token from database if it's an invalid/not-registered error
      if (error.code === 'messaging/invalid-registration-token' || 
          error.code === 'messaging/registration-token-not-registered') {
        await removeInvalidToken(token);
      }
      
      return { success: false, token, error };
    }
  });

  // Wait for all notifications to be sent
  const results = await Promise.allSettled(sendPromises);

  // Count successes and failures
  results.forEach((result) => {
    if (result.status === 'fulfilled' && result.value.success) {
      successCount++;
    } else {
      failureCount++;
    }
  });

  logger.success(`Notifications sent: ${successCount}/${validTokens.length}`);
  
  if (failureCount > 0) {
    logger.warn(`${failureCount} notifications failed`);
  }

  return {
    successCount,
    failureCount,
    responses: results.map((result, idx) => ({
      success: result.status === 'fulfilled' && result.value.success !== false,
      token: validTokens[idx],
    })),
  };
}

module.exports = {
  sendNotification,
  sendMulticastNotification,
  removeInvalidToken,
};

