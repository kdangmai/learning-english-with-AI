const nodemailer = require('nodemailer');
require('dotenv').config();

class EmailService {
  static transporter = null;

  static getTransporter() {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    }
    return this.transporter;
  }

  /**
   * Send verification email with token
   */
  static async sendVerificationEmail(email, token, username) {
    try {
      const verificationLink = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
      
      const mailOptions = {
        from: process.env.SMTP_USER,
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

      const result = await this.getTransporter().sendMail(mailOptions);
      return result;
    } catch (error) {
      console.error('Email sending error:', error);
      throw new Error('Failed to send verification email');
    }
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(email, token, username) {
    try {
      const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
      
      const mailOptions = {
        from: process.env.SMTP_USER,
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

      return await this.getTransporter().sendMail(mailOptions);
    } catch (error) {
      console.error('Email sending error:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  /**
   * Send learning milestone email
   */
  static async sendMilestoneEmail(email, username, milestone) {
    try {
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: email,
        subject: `Congratulations on your milestone! - English Learning Platform`,
        html: `
          <h2>Great Achievement! 🎉</h2>
          <p>Hi ${username},</p>
          <p>${milestone}</p>
          <p>Keep up the great work and continue learning!</p>
        `
      };

      return await this.getTransporter().sendMail(mailOptions);
    } catch (error) {
      console.error('Email sending error:', error);
      throw new Error('Failed to send milestone email');
    }
  }
}

module.exports = EmailService;
