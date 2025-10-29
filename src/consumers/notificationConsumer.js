const logger = require('../config/logger');
const emailService = require('../services/emailService');

/**
 * Notification Consumer
 * Handles Kafka message consumption and email sending
 */
class NotificationConsumer {
  constructor(consumer) {
    this.consumer = consumer;
    this.isRunning = false;
    this.messageProcessingTimeout = 30000; // 30 seconds
  }

  /**
   * Start consuming messages from Kafka topic
   * @param {string} topic - Kafka topic name
   */
  async start(topic) {
    try {
      logger.info('Starting notification consumer...');

      // Initialize email service
      await emailService.initialize();

      this.isRunning = true;

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          await this._processMessage(topic, partition, message);
        }
      });

      logger.info('Notification consumer started successfully', { topic });
    } catch (error) {
      logger.error('Failed to start notification consumer', { 
        error: error.message,
        topic 
      });
      throw error;
    }
  }

  /**
   * Stop the consumer
   */
  async stop() {
    try {
      logger.info('Stopping notification consumer...');
      this.isRunning = false;
      await emailService.close();
      logger.info('Notification consumer stopped successfully');
    } catch (error) {
      logger.error('Error stopping notification consumer', { error: error.message });
      throw error;
    }
  }

  /**
   * Process individual Kafka message
   * @param {string} topic - Topic name
   * @param {number} partition - Partition number
   * @param {Object} message - Kafka message object
   */
  async _processMessage(topic, partition, message) {
    const messageId = this._generateMessageId(topic, partition, message.offset);
    
    try {
      logger.info('Processing Kafka message', {
        messageId,
        topic,
        partition,
        offset: message.offset,
        timestamp: message.timestamp,
        key: message.key?.toString()
      });

      // Parse message payload
      const messageData = this._parseMessage(message);
      
      // Validate message structure
      this._validateMessage(messageData);

      // Send email
      const result = await this._sendEmailWithTimeout(messageData);

      logger.info('Message processed successfully', {
        messageId,
        to: messageData.to,
        subject: messageData.subject,
        emailMessageId: result.messageId
      });

    } catch (error) {
      logger.error('Failed to process message', {
        messageId,
        topic,
        partition,
        offset: message.offset,
        error: error.message,
        stack: error.stack
      });

      // In production, you might want to send failed messages to a dead letter queue
      // For now, we'll just log the error and continue processing
      this._handleProcessingError(error, messageId);
    }
  }

  /**
   * Parse Kafka message payload
   * @param {Object} message - Kafka message object
   * @returns {Object} Parsed message data
   */
  _parseMessage(message) {
    try {
      const payload = message.value?.toString();
      
      if (!payload) {
        throw new Error('Message payload is empty or null');
      }

      const messageData = JSON.parse(payload);
      
      logger.debug('Message parsed successfully', {
        payload: payload,
        parsedData: messageData
      });

      return messageData;
    } catch (error) {
      logger.error('Failed to parse message payload', {
        error: error.message,
        payload: message.value?.toString()
      });
      throw new Error(`Invalid JSON payload: ${error.message}`);
    }
  }

  /**
   * Validate message structure
   * @param {Object} messageData - Parsed message data
   */
  _validateMessage(messageData) {
    const requiredFields = ['to', 'subject', 'message'];
    
    for (const field of requiredFields) {
      if (!messageData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
      
      if (typeof messageData[field] !== 'string') {
        throw new Error(`Field '${field}' must be a string`);
      }
      
      if (messageData[field].trim().length === 0) {
        throw new Error(`Field '${field}' cannot be empty`);
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(messageData.to)) {
      throw new Error(`Invalid email address format: ${messageData.to}`);
    }

    logger.debug('Message validation passed', {
      to: messageData.to,
      subject: messageData.subject,
      messageLength: messageData.message.length
    });
  }

  /**
   * Send email with timeout
   * @param {Object} messageData - Message data containing email details
   * @returns {Promise<Object>} Email sending result
   */
  async _sendEmailWithTimeout(messageData) {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Email sending timeout after ${this.messageProcessingTimeout}ms`));
      }, this.messageProcessingTimeout);

      try {
        const result = await emailService.sendEmail(
          messageData.to,
          messageData.subject,
          messageData.message
        );
        
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Handle message processing errors
   * @param {Error} error - Processing error
   * @param {string} messageId - Message identifier
   */
  _handleProcessingError(error, messageId) {
    // Log error for monitoring and alerting
    logger.error('Message processing error details', {
      messageId,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });

    // In a production environment, you might want to:
    // 1. Send to dead letter queue
    // 2. Send alert to monitoring system
    // 3. Retry with exponential backoff
    // 4. Store failed messages for manual review
  }

  /**
   * Generate unique message ID for tracking
   * @param {string} topic - Topic name
   * @param {number} partition - Partition number
   * @param {string} offset - Message offset
   * @returns {string} Unique message identifier
   */
  _generateMessageId(topic, partition, offset) {
    return `${topic}-${partition}-${offset}`;
  }

  /**
   * Check if consumer is running
   * @returns {boolean} True if consumer is running
   */
  isConsumerRunning() {
    return this.isRunning;
  }
}

module.exports = NotificationConsumer;
