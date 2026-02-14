const User = require('../models/User');
const EmailService = require('../services/emailService');
const jwt = require('jsonwebtoken');

/**
 * Register new user - sends OTP to email
 */
exports.registerUser = async (req, res) => {
  try {
    const { username, email, password, fullName } = req.body;

    // Validate input
    if (!username || !email || !password || !fullName) {
      return res.status(400).json({
        success: false,
        message: 'Tất cả các trường đều bắt buộc'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      // If user exists but email not verified, allow re-registration with new OTP
      if (!existingUser.isEmailVerified && existingUser.email === email) {
        // Generate new OTP
        const otpCode = EmailService.generateOTP();
        existingUser.otpCode = otpCode;
        existingUser.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        existingUser.password = password; // Will be re-hashed by pre-save hook
        existingUser.username = username;
        existingUser.fullName = fullName;
        await existingUser.save();

        // Send OTP email
        try {
          await EmailService.sendOTPEmail(email, otpCode, username);
        } catch (emailError) {
          console.error('Email sending error:', emailError);
        }

        return res.status(201).json({
          success: true,
          message: 'Mã OTP đã được gửi đến email của bạn.',
          email: email,
          requiresOTP: true
        });
      }

      return res.status(400).json({
        success: false,
        message: existingUser.email === email ? 'Email đã tồn tại' : 'Tên đăng nhập đã tồn tại'
      });
    }

    // Generate OTP code (6 digits)
    const otpCode = EmailService.generateOTP();

    // Create new user with isEmailVerified: false
    const user = new User({
      username,
      email,
      password,
      fullName,
      isEmailVerified: false,
      otpCode: otpCode,
      otpExpires: new Date(Date.now() + 10 * 60 * 1000), // OTP expires in 10 minutes
    });

    await user.save();

    // Send OTP email
    try {
      await EmailService.sendOTPEmail(email, otpCode, username);
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Don't fail the registration, just log the error
    }

    res.status(201).json({
      success: true,
      message: 'Đăng ký thành công. Mã OTP đã được gửi đến email của bạn.',
      email: email,
      requiresOTP: true
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Verify OTP code
 */
exports.verifyOTP = async (req, res) => {
  try {
    const { email, otpCode } = req.body;

    if (!email || !otpCode) {
      return res.status(400).json({
        success: false,
        message: 'Email và mã OTP là bắt buộc'
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy tài khoản với email này'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email đã được xác thực trước đó'
      });
    }

    // Check OTP code
    const isMatch = await user.verifyOTP(otpCode);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Mã OTP không chính xác'
      });
    }

    // Check if OTP has expired
    if (user.otpExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Mã OTP đã hết hạn. Vui lòng yêu cầu gửi lại mã mới.'
      });
    }

    // Mark email as verified
    user.isEmailVerified = true;
    user.otpCode = null;
    user.otpExpires = null;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;

    await user.save();

    res.json({
      success: true,
      message: 'Xác thực email thành công! Bạn có thể đăng nhập ngay bây giờ.',
      verified: true
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi xác thực OTP'
    });
  }
};

/**
 * Resend OTP code
 */
exports.resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email là bắt buộc'
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy tài khoản với email này'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email đã được xác thực trước đó'
      });
    }

    // Generate new OTP
    const otpCode = EmailService.generateOTP();
    user.otpCode = otpCode;
    user.otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await user.save();

    // Send OTP email
    try {
      await EmailService.sendOTPEmail(email, otpCode, user.username);
    } catch (emailError) {
      console.error('Email sending error:', emailError);
    }

    res.json({
      success: true,
      message: 'Mã OTP mới đã được gửi đến email của bạn.'
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Login user - supports email or username
 */
exports.loginUser = async (req, res) => {
  try {
    const { emailOrUsername, email, password } = req.body;

    // Support both 'emailOrUsername' and 'email' field names for backward compatibility
    const loginIdentifier = emailOrUsername || email;

    // Validate input
    if (!loginIdentifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email/Tên đăng nhập và mật khẩu là bắt buộc'
      });
    }

    // Find user by email or username
    const user = await User.findOne({
      $or: [
        { email: loginIdentifier },
        { username: loginIdentifier }
      ]
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Email/Tên đăng nhập hoặc mật khẩu không chính xác'
      });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Tài khoản chưa được xác thực email! Vui lòng xác thực email để đăng nhập.',
        requiresVerification: true,
        email: user.email
      });
    }

    // Compare password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Email/Tên đăng nhập hoặc mật khẩu không chính xác'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      success: true,
      message: 'Đăng nhập thành công',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi đăng nhập'
    });
  }
};

/**
 * Verify email with token (legacy - kept for backward compatibility)
 */
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if token matches
    if (user.emailVerificationToken !== token) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification token'
      });
    }

    // Check if token has expired
    if (user.emailVerificationExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Verification token has expired'
      });
    }

    // Mark email as verified
    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;

    await user.save();

    res.json({
      success: true,
      message: 'Email verified successfully',
      verified: true
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(400).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

/**
 * Resend verification email (legacy)
 */
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified'
      });
    }

    // Generate new verification token
    const verificationToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await user.save();

    // Send verification email
    try {
      await EmailService.sendVerificationEmail(email, verificationToken, user.username);
    } catch (emailError) {
      console.error('Email sending error:', emailError);
    }

    res.json({
      success: true,
      message: 'Verification email sent successfully'
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Logout user
 */
exports.logoutUser = async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
