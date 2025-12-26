const admin = require('firebase-admin');

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
      console.log('✅ Firebase Admin initialized');
    } catch (error) {
      console.warn('⚠️ Firebase initialization skipped (optional):', error.message);
    }
  } else {
    console.log('ℹ️ Firebase Admin not initialized (credentials not provided - optional)');
  }
}

module.exports = admin;

