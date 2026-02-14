const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
require('dotenv').config();

// Initialize Firebase Admin SDK
try {
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    path.join(__dirname, '../../firebase-service-account.json');

  try {
    const fs = require('fs');
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID || 'learning-english-with-michael'
      });

      console.log('✓ Firebase Admin SDK initialized successfully');
    } else {
      console.warn('⚠️ Firebase service account file not found at:', serviceAccountPath);
      console.warn('→ Running without Firebase Admin SDK');
    }
  } catch {
    console.warn('⚠️ Firebase service account could not be loaded');
  }
} catch (error) {
  console.error('Firebase initialization error:', error.message);
}

module.exports = {
  admin
};
