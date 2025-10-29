const { Kafka } = require('kafkajs');
require('dotenv').config();

/**
 * Test script to send messages to Kafka topic
 * This script simulates sending notification messages to test the email service
 */

// Kafka configuration
const kafka = new Kafka({
  clientId: 'test-producer',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

const producer = kafka.producer();

// Test message templates
const testMessages = [
  {
    to: 'palani.ga@cavininfotech.com',
    subject: 'Welcome Email',
    message: '<h1>Welcome!</h1><p>Thank you for joining our service. This is a test email from the notification microservice.</p>'
  },
  {
    to: 'palani.ga@cavininfotech.com',
    subject: 'Order Confirmation',
    message: 'Your order #12345 has been confirmed and will be processed within 24 hours.'
  },
  {
    to: 'palani.ga@cavininfotech.com',
    subject: 'Password Reset',
    message: '<div><h2>Password Reset Request</h2><p>You requested a password reset. Click the link below to reset your password:</p><a href="https://example.com/reset">Reset Password</a></div>'
  },
  {
    to: 'palani.ga@cavininfotech.com',
    subject: 'System Notification',
    message: 'This is a plain text notification message without HTML formatting.'
  }
];

/**
 * Send a single test message
 * @param {Object} messageData - Message data to send
 * @param {string} topic - Kafka topic name
 */
async function sendTestMessage(messageData, topic = 'email-notifications') {
  try {
    console.log('Connecting to Kafka...');
    await producer.connect();

    console.log('Sending test message...', {
      topic,
      to: messageData.to,
      subject: messageData.subject
    });

    const result = await producer.send({
      topic,
      messages: [
        {
          key: `email-${Date.now()}`,
          value: JSON.stringify(messageData),
          timestamp: Date.now().toString()
        }
      ]
    });

    console.log('✅ Message sent successfully!', {
      topic: result[0].topicName,
      partition: result[0].partition,
      offset: result[0].baseOffset
    });

    return result;
  } catch (error) {
    console.error('❌ Failed to send message:', error.message);
    throw error;
  } finally {
    await producer.disconnect();
    console.log('Disconnected from Kafka');
  }
}

/**
 * Send multiple test messages with delay
 * @param {Array} messages - Array of message data
 * @param {string} topic - Kafka topic name
 * @param {number} delayMs - Delay between messages in milliseconds
 */
async function sendMultipleTestMessages(messages, topic = 'email-notifications', delayMs = 2000) {
  try {
    console.log('Connecting to Kafka...');
    await producer.connect();

    console.log(`📤 Sending ${messages.length} test messages with ${delayMs}ms delay...`);

    for (let i = 0; i < messages.length; i++) {
      const messageData = messages[i];
      
      console.log(`\n📧 Sending message ${i + 1}/${messages.length}:`, {
        to: messageData.to,
        subject: messageData.subject
      });

      const result = await producer.send({
        topic,
        messages: [
          {
            key: `email-${Date.now()}-${i}`,
            value: JSON.stringify(messageData),
            timestamp: Date.now().toString()
          }
        ]
      });

      console.log('✅ Message sent:', {
        partition: result[0].partition,
        offset: result[0].baseOffset
      });

      // Add delay between messages (except for the last one)
      if (i < messages.length - 1) {
        console.log(`⏳ Waiting ${delayMs}ms before next message...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    console.log('\n🎉 All test messages sent successfully!');
  } catch (error) {
    console.error('❌ Failed to send messages:', error.message);
    throw error;
  } finally {
    await producer.disconnect();
    console.log('Disconnected from Kafka');
  }
}

/**
 * Send invalid message to test error handling
 * @param {string} topic - Kafka topic name
 */
async function sendInvalidMessage(topic = 'email-notifications') {
  try {
    console.log('Connecting to Kafka...');
    await producer.connect();

    const invalidMessages = [
      // Missing required field
      {
        to: 'test@example.com',
        subject: 'Test Subject'
        // Missing 'message' field
      },
      // Invalid email format
      {
        to: 'invalid-email',
        subject: 'Test Subject',
        message: 'Test message'
      },
      // Invalid JSON structure
      JSON.stringify({
        to: 'test@example.com',
        subject: 'Test Subject',
        message: 'Test message',
        extraField: 'This should cause validation error'
      })
    ];

    console.log('📤 Sending invalid test messages to test error handling...');

    for (let i = 0; i < invalidMessages.length; i++) {
      const messageData = invalidMessages[i];
      
      console.log(`\n📧 Sending invalid message ${i + 1}/${invalidMessages.length}:`, {
        type: typeof messageData,
        content: typeof messageData === 'string' ? 'JSON String' : messageData
      });

      const result = await producer.send({
        topic,
        messages: [
          {
            key: `invalid-${Date.now()}-${i}`,
            value: typeof messageData === 'string' ? messageData : JSON.stringify(messageData),
            timestamp: Date.now().toString()
          }
        ]
      });

      console.log('✅ Invalid message sent (should trigger error handling):', {
        partition: result[0].partition,
        offset: result[0].baseOffset
      });

      // Add delay between messages
      if (i < invalidMessages.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('\n🎉 Invalid test messages sent successfully!');
  } catch (error) {
    console.error('❌ Failed to send invalid messages:', error.message);
    throw error;
  } finally {
    await producer.disconnect();
    console.log('Disconnected from Kafka');
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'single';

  console.log('🚀 Kafka Test Message Sender');
  console.log('============================');
  console.log(`Kafka Broker: ${process.env.KAFKA_BROKER || 'localhost:9092'}`);
  console.log(`Topic: ${process.env.KAFKA_TOPIC || 'email-notifications'}`);
  console.log(`Command: ${command}\n`);

  try {
    switch (command) {
      case 'single':
        await sendTestMessage(testMessages[0]);
        break;
      
      case 'multiple':
        await sendMultipleTestMessages(testMessages);
        break;
      
      case 'invalid':
        await sendInvalidMessage();
        break;
      
      case 'all':
        console.log('📤 Running all test scenarios...\n');
        
        console.log('1️⃣ Sending single valid message...');
        await sendTestMessage(testMessages[0]);
        
        console.log('\n2️⃣ Sending multiple valid messages...');
        await sendMultipleTestMessages(testMessages.slice(1, 3), process.env.KAFKA_TOPIC || 'email-notifications', 1000);
        
        console.log('\n3️⃣ Sending invalid messages...');
        await sendInvalidMessage();
        
        break;
      
      default:
        console.log('Usage: node send-test-message.js [single|multiple|invalid|all]');
        console.log('  single   - Send one test message');
        console.log('  multiple - Send multiple test messages');
        console.log('  invalid  - Send invalid messages to test error handling');
        console.log('  all      - Run all test scenarios');
        break;
    }
  } catch (error) {
    console.error('💥 Test failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  sendTestMessage,
  sendMultipleTestMessages,
  sendInvalidMessage,
  testMessages
};
