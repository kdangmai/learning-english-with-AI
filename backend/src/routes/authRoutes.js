const express = require('express');
const authController = require('../controllers/authController');
const router = express.Router();

// POST /api/auth/register - Register new user
router.post('/register', authController.registerUser);

// POST /api/auth/login - Login user
router.post('/login', authController.loginUser);

// POST /api/auth/verify-email - Verify email with token
router.post('/verify-email', authController.verifyEmail);

// POST /api/auth/resend-verification - Resend verification email
router.post('/resend-verification', authController.resendVerification);

// POST /api/auth/logout - Logout user
router.post('/logout', (req, res) => {
  res.json({ message: 'Logout endpoint' });
});

module.exports = router;
