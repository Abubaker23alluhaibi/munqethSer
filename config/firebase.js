const admin = require('firebase-admin');
const logger = require('../utils/logger');

// Initialize Firebase Admin (optional - only if credentials are provided)
if (!admin.apps.length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

  // Only initialize if all required credentials are present
  if (projectId && privateKey && clientEmail) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: projectId,
          privateKey: privateKey.replace(/\\n/g, '\n'),
          clientEmail: clientEmail,
        }),
      });
      logger.success('Firebase Admin initialized');
    } catch (error) {
      logger.warn('Firebase initialization skipped (optional):', error.message);
    }
  } else {
    logger.info('Firebase Admin not initialized (credentials not provided - optional)');
  }
}

module.exports = admin;

