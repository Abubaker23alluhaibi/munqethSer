const admin = require('../config/firebase');

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
 * Send push notification to a device
 * @param {string} fcmToken - FCM token of the device
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data
 */
async function sendNotification(fcmToken, title, body, data = {}) {
  if (!fcmToken) {
    console.warn('⚠️ No FCM token provided - notification not sent');
    return null;
  }

  if (!isFirebaseInitialized()) {
    console.warn('⚠️ Firebase not initialized - notification not sent');
    console.warn('⚠️ Check if FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL are set');
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

    console.log(`📤 Sending notification to token: ${fcmToken.substring(0, 20)}...`);
    console.log(`📝 Title: ${title}, Body: ${body}`);
    
    const response = await admin.messaging().send(message);
    console.log('✅ Notification sent successfully:', response);
    return response;
  } catch (error) {
    console.error('❌ Error sending notification:', error);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error message:', error.message);
    
    // Handle specific Firebase errors
    if (error.code === 'messaging/invalid-registration-token' || 
        error.code === 'messaging/registration-token-not-registered') {
      console.warn('⚠️ Invalid or expired FCM token - user may need to re-login');
    } else if (error.code === 'messaging/invalid-argument') {
      console.warn('⚠️ Invalid message format');
    }
    
    throw error;
  }
}

/**
 * Send notification to multiple devices
 * @param {string[]} fcmTokens - Array of FCM tokens
 * @param {string} title - Notification title
 * @param {string} body - Notification body
 * @param {object} data - Additional data
 */
async function sendMulticastNotification(fcmTokens, title, body, data = {}) {
  if (!fcmTokens || fcmTokens.length === 0) {
    console.warn('⚠️ No FCM tokens provided - notifications not sent');
    return null;
  }

  // Filter out null/undefined tokens
  const validTokens = fcmTokens.filter(token => token && token.trim().length > 0);
  if (validTokens.length === 0) {
    console.warn('⚠️ No valid FCM tokens provided - notifications not sent');
    return null;
  }

  if (validTokens.length < fcmTokens.length) {
    console.warn(`⚠️ Filtered out ${fcmTokens.length - validTokens.length} invalid tokens`);
  }

  if (!isFirebaseInitialized()) {
    console.warn('⚠️ Firebase not initialized - notifications not sent');
    console.warn('⚠️ Check if FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL are set');
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
      tokens: validTokens,
    };

    console.log(`📤 Sending notifications to ${validTokens.length} devices`);
    console.log(`📝 Title: ${title}, Body: ${body}`);
    
    const response = await admin.messaging().sendMulticast(message);
    console.log(`✅ Notifications sent: ${response.successCount}/${validTokens.length}`);
    
    if (response.failureCount > 0) {
      console.warn(`⚠️ ${response.failureCount} notifications failed`);
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(`❌ Failed to send to token ${validTokens[idx].substring(0, 20)}...:`, resp.error?.code, resp.error?.message);
        }
      });
    }
    return response;
  } catch (error) {
    console.error('❌ Error sending multicast notification:', error);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error message:', error.message);
    throw error;
  }
}

module.exports = {
  sendNotification,
  sendMulticastNotification,
};

