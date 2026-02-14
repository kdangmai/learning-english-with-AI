const express = require('express');
const authController = require('../controllers/authController');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// Rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes'
  }
});

// Rate limiter for OTP verification (stricter)
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 verify attempts per windowMs
  message: {
    success: false,
    message: 'Too many verification attempts, please try again later'
  }
});

// POST /api/auth/register - Register new user (sends OTP)
router.post('/register', authLimiter, authController.registerUser);

// POST /api/auth/login - Login user
router.post('/login', authLimiter, authController.loginUser);

// POST /api/auth/verify-otp - Verify email with OTP code
router.post('/verify-otp', otpLimiter, authController.verifyOTP);

// POST /api/auth/resend-otp - Resend OTP code
router.post('/resend-otp', authLimiter, authController.resendOTP);

// POST /api/auth/verify-email - Verify email with token (legacy)
router.post('/verify-email', authController.verifyEmail);

// POST /api/auth/resend-verification - Resend verification email (legacy)
router.post('/resend-verification', authController.resendVerification);

// POST /api/auth/logout - Logout user
router.post('/logout', (req, res) => {
  res.json({ message: 'Logout endpoint' });
});

module.exports = router;
