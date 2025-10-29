const logger = require('../config/logger');
const { getMailTransporter, verifyMailTransporter } = require('../config/mail');

/**
 * Email Service
 * Handles email sending operations using configured mail transporter
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.isInitialized = false;
    this.retryAttempts = 3;
    this.retryDelay = 1000; // 1 second
  }

  /**
   * Initialize the email service
   * Creates and verifies mail transporter connection
   */
  async initialize() {
    try {
      logger.info('Initializing email service...');
      
      this.transporter = getMailTransporter();
      const isVerified = await verifyMailTransporter(this.transporter);
      
      if (!isVerified) {
        throw new Error('Failed to verify mail transporter connection');
      }
      
      this.isInitialized = true;
      logger.info('Email service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize email service', { error: error.message });
      throw error;
    }
  }

  /**
   * Send email with retry logic
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject
   * @param {string} message - Email message content (HTML or plain text)
   * @returns {Promise<Object>} Email sending result
   */
  async sendEmail(to, subject, message) {
    if (!this.isInitialized) {
      throw new Error('Email service not initialized. Call initialize() first.');
    }

    // Validate input parameters
    this._validateEmailParams(to, subject, message);

    const emailData = {
      from: process.env.MAIL_FROM || process.env.MAIL_USER,
      to: to,
      subject: subject,
      html: this._isHtmlContent(message) ? message : this._convertToHtml(message),
      text: this._isHtmlContent(message) ? this._stripHtml(message) : message
    };

    logger.info('Attempting to send email', {
      to: to,
      subject: subject,
      messageLength: message.length
    });

    // Retry logic for transient failures
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const result = await this._sendEmailWithRetry(emailData);
        
        logger.info('Email sent successfully', {
          to: to,
          subject: subject,
          messageId: result.messageId,
          attempt: attempt
        });

        return {
          success: true,
          messageId: result.messageId,
          attempt: attempt
        };
      } catch (error) {
        logger.warn(`Email send attempt ${attempt} failed`, {
          to: to,
          subject: subject,
          error: error.message,
          attempt: attempt
        });

        if (attempt === this.retryAttempts) {
          logger.error('All email send attempts failed', {
            to: to,
            subject: subject,
            error: error.message,
            totalAttempts: this.retryAttempts
          });
          throw error;
        }

        // Wait before retry
        await this._delay(this.retryDelay * attempt);
      }
    }
  }

  /**
   * Internal method to send email
   * @param {Object} emailData - Email data object
   * @returns {Promise<Object>} Send result
   */
  async _sendEmailWithRetry(emailData) {
    return new Promise((resolve, reject) => {
      this.transporter.sendMail(emailData, (error, info) => {
        if (error) {
          reject(error);
        } else {
          resolve(info);
        }
      });
    });
  }

  /**
   * Validate email parameters
   * @param {string} to - Recipient email
   * @param {string} subject - Email subject
   * @param {string} message - Email message
   */
  _validateEmailParams(to, subject, message) {
    if (!to || typeof to !== 'string' || !this._isValidEmail(to)) {
      throw new Error('Invalid recipient email address');
    }

    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      throw new Error('Email subject is required and cannot be empty');
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      throw new Error('Email message is required and cannot be empty');
    }
  }

  /**
   * Check if email address is valid
   * @param {string} email - Email address to validate
   * @returns {boolean} True if valid email format
   */
  _isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Check if content is HTML
   * @param {string} content - Content to check
   * @returns {boolean} True if HTML content
   */
  _isHtmlContent(content) {
    return /<[^>]*>/g.test(content);
  }

  /**
   * Convert plain text to HTML
   * @param {string} text - Plain text content
   * @returns {string} HTML formatted content
   */
  _convertToHtml(text) {
    return text
      .replace(/\n/g, '<br>')
      .replace(/  /g, '&nbsp;&nbsp;');
  }

  /**
   * Strip HTML tags from content
   * @param {string} html - HTML content
   * @returns {string} Plain text content
   */
  _stripHtml(html) {
    return html.replace(/<[^>]*>/g, '');
  }

  /**
   * Delay execution for specified milliseconds
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise} Promise that resolves after delay
   */
  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Close transporter connection
   */
  async close() {
    if (this.transporter && this.transporter.close) {
      try {
        await this.transporter.close();
        logger.info('Email service transporter closed');
      } catch (error) {
        logger.error('Error closing email service transporter', { error: error.message });
      }
    }
  }
}

module.exports = new EmailService();
