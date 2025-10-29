const { Kafka } = require('kafkajs');
const logger = require('./logger');

/**
 * Kafka client configuration
 * Creates and configures Kafka client with connection settings
 */
const createKafkaClient = () => {
  try {
    const kafka = new Kafka({
      clientId: 'email-notification-service',
      brokers: process.env.KAFKA_BROKER.split(','),
      retry: {
        initialRetryTime: 100,
        retries: 8
      },
      // Connection timeout settings
      connectionTimeout: 3000,
      requestTimeout: 25000,
      // Logging configuration
      logLevel: process.env.NODE_ENV === 'production' ? 1 : 4,
      logCreator: () => ({ namespace, level, label, log }) => {
        const { message, ...extra } = log;
        logger.debug(`[Kafka ${namespace}] ${message}`, extra);
      }
    });

    logger.info('Kafka client created successfully', {
      brokers: process.env.KAFKA_BROKER.split(','),
      clientId: 'email-notification-service'
    });

    return kafka;
  } catch (error) {
    logger.error('Failed to create Kafka client', { error: error.message });
    throw error;
  }
};

/**
 * Create Kafka consumer
 * @param {Object} kafka - Kafka client instance
 * @returns {Object} Consumer instance
 */
const createConsumer = (kafka) => {
  try {
    const consumer = kafka.consumer({
      groupId: process.env.KAFKA_GROUP_ID,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      maxWaitTimeInMs: 5000,
      retry: {
        initialRetryTime: 100,
        retries: 8
      }
    });

    logger.info('Kafka consumer created successfully', {
      groupId: process.env.KAFKA_GROUP_ID,
      topic: process.env.KAFKA_TOPIC
    });

    return consumer;
  } catch (error) {
    logger.error('Failed to create Kafka consumer', { error: error.message });
    throw error;
  }
};

/**
 * Connect consumer to Kafka cluster
 * @param {Object} consumer - Consumer instance
 * @param {string} topic - Topic name to subscribe to
 */
const connectConsumer = async (consumer, topic) => {
  try {
    logger.info('Connecting consumer to Kafka cluster...');
    
    await consumer.connect();
    logger.info('Consumer connected to Kafka cluster successfully');

    await consumer.subscribe({ 
      topic, 
      fromBeginning: false // Start from latest messages
    });
    logger.info(`Consumer subscribed to topic: ${topic}`);

    return consumer;
  } catch (error) {
    logger.error('Failed to connect consumer to Kafka', { 
      error: error.message,
      topic 
    });
    throw error;
  }
};

/**
 * Gracefully disconnect consumer
 * @param {Object} consumer - Consumer instance
 */
const disconnectConsumer = async (consumer) => {
  try {
    logger.info('Disconnecting consumer from Kafka cluster...');
    await consumer.disconnect();
    logger.info('Consumer disconnected successfully');
  } catch (error) {
    logger.error('Error disconnecting consumer', { error: error.message });
    throw error;
  }
};

module.exports = {
  createKafkaClient,
  createConsumer,
  connectConsumer,
  disconnectConsumer
};
