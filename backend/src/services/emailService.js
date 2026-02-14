const nodemailer = require('nodemailer');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
require('dotenv').config();

class EmailService {
  static transporter = null;
  static isEthereal = false;

  static async getTransporter() {
    if (!this.transporter) {
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;

      // Check if real SMTP credentials are provided
      if (smtpUser && smtpPass && smtpUser !== '' && smtpPass !== '') {
        console.log('📧 SMTP Config (Gmail):', {
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: Number(process.env.SMTP_PORT) || 587,
          user: smtpUser,
          passLength: smtpPass.length
        });

        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: Number(process.env.SMTP_PORT) || 587,
          secure: false,
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        });

        // Verify connection
        try {
          await this.transporter.verify();
          console.log('✅ SMTP connection verified successfully!');
          this.isEthereal = false;
        } catch (verifyError) {
          console.warn('⚠️ Gmail SMTP verification failed:', verifyError.message);
          console.warn('→ Falling back to Ethereal test email...');
          this.transporter = null; // Reset to trigger Ethereal fallback
        }
      }

      // Fallback: Use Ethereal test email (free, no real email sent)
      if (!this.transporter) {
        try {
          const testAccount = await nodemailer.createTestAccount();
          console.log('📧 Using Ethereal test email (no real email sent)');
          console.log('   Ethereal user:', testAccount.user);

          this.transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
              user: testAccount.user,
              pass: testAccount.pass
            }
          });
          this.isEthereal = true;
        } catch (etherealError) {
          console.error('❌ Ethereal fallback also failed:', etherealError.message);
          // Create a dummy transporter that will just log
          this.transporter = {
            sendMail: async (options) => {
              console.log('📬 [DUMMY MAIL] Would send to:', options.to);
              return { messageId: 'dummy-' + Date.now() };
            }
          };
          this.isEthereal = true;
        }
      }
    }
    return this.transporter;
  }

  /**
   * Generate a 6-digit OTP code
   */
  static generateOTP() {
    // Use crypto for secure random number generation
    const crypto = require('crypto');
    return crypto.randomInt(100000, 999999).toString();
  }

  /**
   * Build the OTP email HTML template
   */
  static buildOTPEmailHTML(otpCode, username) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; margin: 0; padding: 0; background: #f4f6fb; }
          .container { max-width: 480px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
          .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px 24px; text-align: center; }
          .header h1 { color: white; margin: 0; font-size: 1.4rem; }
          .header p { color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 0.9rem; }
          .body { padding: 32px 24px; }
          .greeting { font-size: 1rem; color: #334155; margin-bottom: 16px; }
          .otp-box { background: linear-gradient(135deg, #eef2ff, #f0f9ff); border: 2px dashed #6366f1; border-radius: 12px; padding: 24px; text-align: center; margin: 20px 0; }
          .otp-code { font-size: 2.2rem; font-weight: 800; letter-spacing: 8px; color: #6366f1; margin: 0; }
          .otp-label { font-size: 0.82rem; color: #64748b; margin-top: 8px; }
          .info { font-size: 0.88rem; color: #64748b; line-height: 1.6; }
          .warning { background: #fefce8; border: 1px solid #fde68a; border-radius: 8px; padding: 12px 16px; font-size: 0.82rem; color: #92400e; margin-top: 16px; }
          .footer { background: #f8fafc; padding: 20px 24px; text-align: center; font-size: 0.78rem; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎓 LearnEnglish AI</h1>
            <p>Xác thực tài khoản của bạn</p>
          </div>
          <div class="body">
            <p class="greeting">Xin chào <strong>${username}</strong>,</p>
            <p class="info">Cảm ơn bạn đã đăng ký tài khoản tại <strong>LearnEnglish AI</strong>. Vui lòng sử dụng mã OTP bên dưới để xác thực email của bạn:</p>
            
            <div class="otp-box">
              <p class="otp-code">${otpCode}</p>
              <p class="otp-label">Mã xác thực của bạn</p>
            </div>

            <p class="info">Mã này có hiệu lực trong <strong>10 phút</strong>. Vui lòng không chia sẻ mã này với bất kỳ ai.</p>
            
            <div class="warning">
              ⚠️ Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này. Tài khoản của bạn vẫn an toàn.
            </div>
          </div>
          <div class="footer">
            © ${new Date().getFullYear()} LearnEnglish AI - Hành trình học tiếng Anh của bạn
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Send OTP verification email
   */
  static async sendOTPEmail(email, otpCode, username) {
    try {
      const transporter = await this.getTransporter();

      const mailOptions = {
        from: `"LearnEnglish AI" <${process.env.SMTP_USER || 'noreply@learnai.com'}>`,
        to: email,
        subject: '🔐 Mã xác thực Email - LearnEnglish AI',
        html: this.buildOTPEmailHTML(otpCode, username)
      };

      const result = await transporter.sendMail(mailOptions);

      // If using Ethereal, show preview URL
      if (this.isEthereal) {
        const previewURL = nodemailer.getTestMessageUrl(result);
        console.log('\n╔══════════════════════════════════════════════════╗');
        console.log('║  📧 OTP EMAIL (Ethereal Test Mode)               ║');
        console.log('╠══════════════════════════════════════════════════╣');
        console.log(`║  📬 To: ${email}`);
        console.log(`║  🔑 OTP Code: ${otpCode}`);
        if (previewURL) {
          console.log(`║  🔗 Preview: ${previewURL}`);
        }
        console.log('╚══════════════════════════════════════════════════╝\n');
      } else {
        console.log(`✅ OTP email sent to: ${email}`);
      }

      return result;
    } catch (error) {
      // CRITICAL FALLBACK: Always log OTP to console so user can still test
      console.error('❌ Email sending failed:', error.message);

      // Only show full OTP in development for security
      if (process.env.NODE_ENV !== 'production') {
        console.log('\n╔══════════════════════════════════════════════════╗');
        console.log('║  🚨 EMAIL SENDING FAILED - CONSOLE FALLBACK     ║');
        console.log('╠══════════════════════════════════════════════════╣');
        console.log(`║  📬 To: ${email}`);
        console.log(`║  👤 User: ${username}`);
        console.log(`║  🔑 OTP Code: ${otpCode}`);
        console.log('║                                                  ║');
        console.log('║  ℹ️  Use this OTP to verify your account.        ║');
        console.log('║  Fix SMTP settings in .env to enable real email. ║');
        console.log('╚══════════════════════════════════════════════════╝\n');
      } else {
        console.log('⚠️ OTP email failed to send. Check server logs for details.');
      }

      // Don't throw - let registration continue with OTP visible in console
      return { messageId: 'console-fallback-' + Date.now(), consoleFallback: true };
    }
  }

  /**
   * Send verification email with token (legacy - kept for compatibility)
   */
  static async sendVerificationEmail(email, token, username) {
    try {
      const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
      const transporter = await this.getTransporter();

      const mailOptions = {
        from: `"LearnEnglish AI" <${process.env.SMTP_USER || 'noreply@learnai.com'}>`,
        to: email,
        subject: 'Email Verification - English Learning Platform',
        html: `
          <h2>Welcome to English Learning Platform!</h2>
          <p>Hi ${username},</p>
          <p>Please verify your email address by clicking the link below:</p>
          <p><a href="${verificationLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a></p>
          <p>Or copy this link: ${verificationLink}</p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create this account, please ignore this email.</p>
        `
      };

      const result = await transporter.sendMail(mailOptions);
      if (this.isEthereal) {
        console.log('🔗 Email Preview:', nodemailer.getTestMessageUrl(result));
      }
      return result;
    } catch (error) {
      console.error('Email sending error:', error);
      throw new Error('Failed to send verification email', { cause: error });
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(email, token, username) {
    try {
      const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
      const transporter = await this.getTransporter();

      const mailOptions = {
        from: `"LearnEnglish AI" <${process.env.SMTP_USER || 'noreply@learnai.com'}>`,
        to: email,
        subject: 'Password Reset - English Learning Platform',
        html: `
          <h2>Password Reset Request</h2>
          <p>Hi ${username},</p>
          <p>Click the link below to reset your password:</p>
          <p><a href="${resetLink}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
          <p>Or copy this link: ${resetLink}</p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this, please ignore this email.</p>
        `
      };

      return await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Email sending error:', error);
      throw new Error('Failed to send password reset email', { cause: error });
    }
  }

  /**
   * Send learning milestone email
   */
  static async sendMilestoneEmail(email, username, milestone) {
    try {
      const transporter = await this.getTransporter();

      const mailOptions = {
        from: `"LearnEnglish AI" <${process.env.SMTP_USER || 'noreply@learnai.com'}>`,
        to: email,
        subject: `Congratulations on your milestone! - English Learning Platform`,
        html: `
          <h2>Great Achievement! 🎉</h2>
          <p>Hi ${username},</p>
          <p>${milestone}</p>
          <p>Keep up the great work and continue learning!</p>
        `
      };

      return await transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Email sending error:', error);
      throw new Error('Failed to send milestone email', { cause: error });
    }
  }
}

module.exports = EmailService;
