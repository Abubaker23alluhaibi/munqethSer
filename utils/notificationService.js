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
    console.warn('No FCM token provided');
    return;
  }

  if (!isFirebaseInitialized()) {
    console.warn('⚠️ Firebase not initialized - notification not sent');
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

    const response = await admin.messaging().send(message);
    console.log('✅ Notification sent:', response);
    return response;
  } catch (error) {
    console.error('❌ Error sending notification:', error);
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
    console.warn('No FCM tokens provided');
    return;
  }

  if (!isFirebaseInitialized()) {
    console.warn('⚠️ Firebase not initialized - notifications not sent');
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
      tokens: fcmTokens,
    };

    const response = await admin.messaging().sendMulticast(message);
    console.log(`✅ Notifications sent: ${response.successCount}/${fcmTokens.length}`);
    if (response.failureCount > 0) {
      console.warn(`⚠️ ${response.failureCount} notifications failed`);
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(`Failed to send to token ${fcmTokens[idx]}:`, resp.error);
        }
      });
    }
    return response;
  } catch (error) {
    console.error('❌ Error sending multicast notification:', error);
    throw error;
  }
}

module.exports = {
  sendNotification,
  sendMulticastNotification,
};

