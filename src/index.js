require('dotenv').config();
const logger = require('./config/logger');
const { createKafkaClient, createConsumer, connectConsumer, disconnectConsumer } = require('./config/kafka');
const NotificationConsumer = require('./consumers/notificationConsumer');

/**
 * Main application entry point
 * Initializes Kafka connection and starts the notification consumer
 */
class NotificationService {
  constructor() {
    this.kafka = null;
    this.consumer = null;
    this.notificationConsumer = null;
    this.isShuttingDown = false;
  }

  /**
   * Initialize and start the notification service
   */
  async start() {
    try {
      logger.info('Starting Email Notification Microservice...');
      
      // Validate required environment variables
      this._validateEnvironment();

      // Create Kafka client and consumer
      this.kafka = createKafkaClient();
      this.consumer = createConsumer(this.kafka);

      // Connect consumer to Kafka cluster
      await connectConsumer(this.consumer, process.env.KAFKA_TOPIC);

      // Create and start notification consumer
      this.notificationConsumer = new NotificationConsumer(this.consumer);
      await this.notificationConsumer.start(process.env.KAFKA_TOPIC);

      // Setup graceful shutdown handlers
      this._setupGracefulShutdown();

      logger.info('Email Notification Microservice started successfully', {
        kafkaBroker: process.env.KAFKA_BROKER,
        kafkaTopic: process.env.KAFKA_TOPIC,
        kafkaGroupId: process.env.KAFKA_GROUP_ID,
        emailProvider: process.env.EMAIL_PROVIDER
      });

    } catch (error) {
      logger.error('Failed to start Email Notification Microservice', { 
        error: error.message,
        stack: error.stack
      });
      await this.shutdown();
      process.exit(1);
    }
  }

  /**
   * Validate required environment variables
   */
  _validateEnvironment() {
    const requiredEnvVars = [
      'KAFKA_BROKER',
      'KAFKA_GROUP_ID',
      'KAFKA_TOPIC',
      'EMAIL_PROVIDER'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Validate email provider specific environment variables
    if (process.env.EMAIL_PROVIDER.toUpperCase() === 'SMTP') {
      const smtpRequiredVars = ['MAIL_HOST', 'MAIL_PORT', 'MAIL_USER', 'MAIL_PASS'];
      const missingSmtpVars = smtpRequiredVars.filter(varName => !process.env[varName]);
      
      if (missingSmtpVars.length > 0) {
        throw new Error(`Missing SMTP environment variables: ${missingSmtpVars.join(', ')}`);
      }
    }

    if (process.env.EMAIL_PROVIDER.toUpperCase() === 'SES') {
      const sesRequiredVars = ['AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'];
      const missingSesVars = sesRequiredVars.filter(varName => !process.env[varName]);
      
      if (missingSesVars.length > 0) {
        throw new Error(`Missing AWS SES environment variables: ${missingSesVars.join(', ')}`);
      }
    }

    logger.info('Environment validation passed');
  }

  /**
   * Setup graceful shutdown handlers
   */
  _setupGracefulShutdown() {
    const shutdownSignals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];

    shutdownSignals.forEach(signal => {
      process.on(signal, async () => {
        logger.info(`Received ${signal} signal, initiating graceful shutdown...`);
        await this.shutdown();
        process.exit(0);
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      logger.error('Uncaught exception occurred', { 
        error: error.message,
        stack: error.stack
      });
      await this.shutdown();
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (reason, promise) => {
      logger.error('Unhandled promise rejection occurred', { 
        reason: reason?.message || reason,
        promise: promise
      });
      await this.shutdown();
      process.exit(1);
    });
  }

  /**
   * Gracefully shutdown the service
   */
  async shutdown() {
    if (this.isShuttingDown) {
      logger.warn('Shutdown already in progress, ignoring duplicate shutdown request');
      return;
    }

    this.isShuttingDown = true;

    try {
      logger.info('Shutting down Email Notification Microservice...');

      // Stop notification consumer
      if (this.notificationConsumer) {
        await this.notificationConsumer.stop();
      }

      // Disconnect Kafka consumer
      if (this.consumer) {
        await disconnectConsumer(this.consumer);
      }

      logger.info('Email Notification Microservice shutdown completed successfully');
    } catch (error) {
      logger.error('Error during shutdown', { error: error.message });
    }
  }

  /**
   * Get service health status
   * @returns {Object} Health status information
   */
  getHealthStatus() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'email-notification-microservice',
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      isConsumerRunning: this.notificationConsumer?.isConsumerRunning() || false
    };
  }
}

// Create and start the notification service
const notificationService = new NotificationService();

// Start the service
notificationService.start().catch(error => {
  logger.error('Failed to start notification service', { error: error.message });
  process.exit(1);
});

// Export for testing purposes
module.exports = NotificationService;
