const nodemailer = require('nodemailer');
const AWS = require('aws-sdk');
const logger = require('./logger');

/**
 * Create SMTP transporter using Nodemailer
 * @returns {Object} Nodemailer transporter instance
 */
const createSMTPTransporter = () => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: parseInt(process.env.MAIL_PORT) || 587,
      secure: process.env.MAIL_PORT == 465, // true for 465, false for other ports
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS
      },
      tls: {
        // Do not fail on invalid certs
        rejectUnauthorized: false
      },
      // Connection pool settings
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 20000,
      rateLimit: 5,
      // Office 365 specific settings
      requireTLS: true,
      connectionTimeout: 60000,
      greetingTimeout: 30000,
      socketTimeout: 60000
    });

    logger.info('SMTP transporter created successfully', {
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT,
      user: process.env.MAIL_USER
    });

    return transporter;
  } catch (error) {
    logger.error('Failed to create SMTP transporter', { error: error.message });
    throw error;
  }
};

/**
 * Create AWS SES transporter
 * @returns {Object} AWS SES instance
 */
const createSESTransporter = () => {
  try {
    // Configure AWS SDK
    AWS.config.update({
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    });

    const ses = new AWS.SES({
      apiVersion: '2010-12-01'
    });

    // Create nodemailer transporter with SES
    const transporter = nodemailer.createTransport({
      SES: { ses, aws: AWS }
    });

    logger.info('AWS SES transporter created successfully', {
      region: process.env.AWS_REGION
    });

    return transporter;
  } catch (error) {
    logger.error('Failed to create AWS SES transporter', { error: error.message });
    throw error;
  }
};

/**
 * Get mail transporter based on EMAIL_PROVIDER environment variable
 * @returns {Object} Mail transporter instance
 */
const getMailTransporter = () => {
  const emailProvider = process.env.EMAIL_PROVIDER?.toUpperCase();

  logger.info('Initializing mail transporter', { provider: emailProvider });

  switch (emailProvider) {
    case 'SMTP':
      return createSMTPTransporter();
    case 'SES':
      return createSESTransporter();
    default:
      logger.warn('Unknown email provider, defaulting to SMTP', { provider: emailProvider });
      return createSMTPTransporter();
  }
};

/**
 * Verify mail transporter connection
 * @param {Object} transporter - Mail transporter instance
 * @returns {Promise<boolean>} True if connection is verified
 */
const verifyMailTransporter = async (transporter) => {
  try {
    logger.info('Verifying mail transporter connection...');
    await transporter.verify();
    logger.info('Mail transporter connection verified successfully');
    return true;
  } catch (error) {
    logger.error('Failed to verify mail transporter connection', { error: error.message });
    return false;
  }
};

module.exports = {
  getMailTransporter,
  verifyMailTransporter
};
