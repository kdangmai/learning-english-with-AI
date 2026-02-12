const validator = require('validator');

/**
 * Validation Middleware
 */
const validateRegister = (req, res, next) => {
  const { username, email, password, fullName } = req.body;

  if (!username || username.length < 3) {
    return res.status(400).json({
      success: false,
      message: 'Username must be at least 3 characters'
    });
  }

  if (!validator.isEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email format'
    });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters'
    });
  }

  if (!fullName || fullName.length < 2) {
    return res.status(400).json({
      success: false,
      message: 'Full name is required'
    });
  }

  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!validator.isEmail(email)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid email format'
    });
  }

  if (!password) {
    return res.status(400).json({
      success: false,
      message: 'Password is required'
    });
  }

  next();
};

module.exports = {
  validateRegister,
  validateLogin
};
