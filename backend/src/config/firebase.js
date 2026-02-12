const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();

// Initialize Firebase Admin SDK (Optional - can work without it)
let firebaseInitialized = false;
try {
  // Check if firebase-service-account.json exists
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
    path.join(__dirname, '../../firebase-service-account.json');
  
  // Try to load service account - it's optional
  try {
    const fs = require('fs');
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.FIREBASE_PROJECT_ID || 'learning-english-with-ai-b7305'
      });
      
      firebaseInitialized = true;
      console.log('✓ Firebase Admin SDK initialized successfully');
    } else {
      console.warn('⚠️ Firebase service account file not found at:', serviceAccountPath);
      console.warn('→ Email verification will work with JWT tokens only');
    }
  } catch (loadError) {
    console.warn('⚠️ Firebase service account could not be loaded');
    console.warn('→ Email verification will work with JWT tokens only');
  }
} catch (error) {
  console.error('Firebase initialization error:', error.message);
}

const auth = admin.auth();

/**
 * Send email verification link using Firebase
 */
async function sendEmailVerificationLink(email, verificationLink) {
  try {
    // Create a custom email verification link
    const actionCodeSettings = {
      url: verificationLink,
      handleCodeInApp: true,
    };

    // Send email using Firebase's email action link
    const link = await admin.auth().generateEmailVerificationLink(email, actionCodeSettings);
    
    console.log('Verification link generated:', link);
    return link;
  } catch (error) {
    console.error('Firebase email verification error:', error.message);
    throw error;
  }
}

/**
 * Verify email by token (using JWT instead of Firebase for this case)
 */
function verifyEmailToken(token) {
  try {
    const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

module.exports = {
  admin,
  auth,
  sendEmailVerificationLink,
  verifyEmailToken
};
