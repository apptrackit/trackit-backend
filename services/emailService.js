const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Initialize the nodemailer transporter with environment variables
   */
  initializeTransporter() {
    try {
      // Validate required environment variables
      const requiredEnvVars = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS'];
      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        logger.error('Missing required email environment variables:', missingVars);
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
      }

      this.transporter = nodemailer.createTransporter({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        // Additional options
        tls: {
          rejectUnauthorized: process.env.EMAIL_TLS_REJECT_UNAUTHORIZED !== 'false'
        }
      });

      logger.info('Email transporter initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email transporter:', error.message);
      throw error;
    }
  }

  /**
   * Verify the email configuration
   * @returns {Promise<boolean>} True if configuration is valid
   */
  async verifyConnection() {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      await this.transporter.verify();
      logger.info('Email configuration verified successfully');
      return true;
    } catch (error) {
      logger.error('Email configuration verification failed:', error.message);
      return false;
    }
  }

  /**
   * Send an HTML email
   * @param {Object} emailOptions - Email configuration
   * @param {string} emailOptions.to - Recipient email address
   * @param {string} emailOptions.subject - Email subject
   * @param {string} emailOptions.html - HTML content
   * @param {string} [emailOptions.from] - Sender email (defaults to env EMAIL_FROM or EMAIL_USER)
   * @param {string} [emailOptions.text] - Plain text version (optional)
   * @param {Array} [emailOptions.cc] - CC recipients (optional)
   * @param {Array} [emailOptions.bcc] - BCC recipients (optional)
   * @param {Array} [emailOptions.attachments] - Email attachments (optional)
   * @returns {Promise<Object>} Email send result
   */
  async sendHtmlEmail({ to, subject, html, from, text, cc, bcc, attachments }) {
    try {
      if (!this.transporter) {
        throw new Error('Email transporter not initialized');
      }

      // Validate required parameters
      if (!to || !subject || !html) {
        throw new Error('Missing required email parameters: to, subject, and html are required');
      }

      // Prepare email options
      const mailOptions = {
        from: from || process.env.EMAIL_FROM || process.env.EMAIL_USER,
        to: Array.isArray(to) ? to.join(', ') : to,
        subject: subject,
        html: html,
      };

      // Add optional parameters if provided
      if (text) mailOptions.text = text;
      if (cc) mailOptions.cc = Array.isArray(cc) ? cc.join(', ') : cc;
      if (bcc) mailOptions.bcc = Array.isArray(bcc) ? bcc.join(', ') : bcc;
      if (attachments) mailOptions.attachments = attachments;

      // Send the email
      const info = await this.transporter.sendMail(mailOptions);
      
      logger.info(`Email sent successfully to ${to}`, {
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected
      });

      return {
        success: true,
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response
      };

    } catch (error) {
      logger.error('Failed to send email:', {
        error: error.message,
        to: to,
        subject: subject
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send a simple HTML email with just to, subject, and HTML content
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject
   * @param {string} html - HTML content
   * @returns {Promise<Object>} Email send result
   */
  async sendSimpleHtmlEmail(to, subject, html) {
    return this.sendHtmlEmail({ to, subject, html });
  }

  /**
   * Send a welcome email template
   * @param {string} to - Recipient email address
   * @param {string} username - User's name
   * @returns {Promise<Object>} Email send result
   */
  async sendWelcomeEmail(to, username) {
    const subject = 'Welcome to TrackIt!';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to TrackIt</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .footer { padding: 20px; text-align: center; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to TrackIt!</h1>
          </div>
          <div class="content">
            <h2>Hello ${username}!</h2>
            <p>Thank you for joining TrackIt. We're excited to have you on board!</p>
            <p>You can now start tracking your activities and managing your data through our platform.</p>
            <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
          </div>
          <div class="footer">
            <p>Best regards,<br>The TrackIt Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendHtmlEmail({ to, subject, html });
  }

  /**
   * Send a password reset email template
   * @param {string} to - Recipient email address
   * @param {string} username - User's name
   * @param {string} resetLink - Password reset link
   * @returns {Promise<Object>} Email send result
   */
  async sendPasswordResetEmail(to, username, resetLink) {
    const subject = 'Password Reset Request - TrackIt';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #FF6B6B; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { padding: 20px; text-align: center; color: #666; }
          .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; margin: 20px 0; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hello ${username}!</h2>
            <p>We received a request to reset your password for your TrackIt account.</p>
            <p>Click the button below to reset your password:</p>
            <a href="${resetLink}" class="button">Reset Password</a>
            <div class="warning">
              <strong>Security Note:</strong>
              <ul>
                <li>This link will expire in 1 hour for security reasons</li>
                <li>If you didn't request this reset, please ignore this email</li>
                <li>Never share this link with anyone</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            <p>Best regards,<br>The TrackIt Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return this.sendHtmlEmail({ to, subject, html });
  }
}

// Export singleton instance
module.exports = new EmailService();
