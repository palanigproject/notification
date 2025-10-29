const { Kafka } = require('kafkajs');
require('dotenv').config();

/**
 * Test script to verify Kafka connection and topic creation
 * This script helps diagnose Kafka connectivity issues
 */

// Kafka configuration
const kafka = new Kafka({
  clientId: 'kafka-connection-tester',
  brokers: [process.env.KAFKA_BROKER || 'localhost:9092']
});

/**
 * Test Kafka broker connection
 */
async function testBrokerConnection() {
  console.log('🔍 Testing Kafka broker connection...');
  console.log(`Broker: ${process.env.KAFKA_BROKER || 'localhost:9092'}`);
  
  try {
    const admin = kafka.admin();
    await admin.connect();
    console.log('✅ Successfully connected to Kafka broker');
    
    // Get cluster metadata
    const metadata = await admin.describeCluster();
    console.log('📊 Cluster metadata:', {
      clusterId: metadata.clusterId,
      controller: metadata.controller,
      brokers: metadata.brokers.map(broker => ({
        nodeId: broker.nodeId,
        host: broker.host,
        port: broker.port
      }))
    });
    
    await admin.disconnect();
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to Kafka broker:', error.message);
    return false;
  }
}

/**
 * List all topics
 */
async function listTopics() {
  console.log('\n📋 Listing all topics...');
  
  try {
    const admin = kafka.admin();
    await admin.connect();
    
    const topics = await admin.listTopics();
    console.log('📝 Available topics:', topics);
    
    if (topics.length === 0) {
      console.log('ℹ️  No topics found. You may need to create some topics.');
    }
    
    await admin.disconnect();
    return topics;
  } catch (error) {
    console.error('❌ Failed to list topics:', error.message);
    return [];
  }
}

/**
 * Create test topic
 * @param {string} topicName - Name of the topic to create
 */
async function createTopic(topicName = 'email-notifications') {
  console.log(`\n🏗️  Creating topic: ${topicName}`);
  
  try {
    const admin = kafka.admin();
    await admin.connect();
    
    // Check if topic already exists
    const existingTopics = await admin.listTopics();
    if (existingTopics.includes(topicName)) {
      console.log(`ℹ️  Topic '${topicName}' already exists`);
      await admin.disconnect();
      return true;
    }
    
    await admin.createTopics({
      topics: [{
        topic: topicName,
        numPartitions: 1,
        replicationFactor: 1
      }]
    });
    
    console.log(`✅ Successfully created topic: ${topicName}`);
    await admin.disconnect();
    return true;
  } catch (error) {
    console.error(`❌ Failed to create topic '${topicName}':`, error.message);
    return false;
  }
}

/**
 * Get topic details
 * @param {string} topicName - Name of the topic
 */
async function getTopicDetails(topicName = 'email-notifications') {
  console.log(`\n📊 Getting details for topic: ${topicName}`);
  
  try {
    const admin = kafka.admin();
    await admin.connect();
    
    const metadata = await admin.fetchTopicMetadata({
      topics: [topicName]
    });
    
    const topicMetadata = metadata.topics.find(topic => topic.name === topicName);
    
    if (!topicMetadata) {
      console.log(`❌ Topic '${topicName}' not found`);
      await admin.disconnect();
      return null;
    }
    
    console.log('📝 Topic details:', {
      name: topicMetadata.name,
      partitions: topicMetadata.partitions.map(partition => ({
        partitionId: partition.partitionId,
        leader: partition.leader,
        replicas: partition.replicas,
        isr: partition.isr
      }))
    });
    
    await admin.disconnect();
    return topicMetadata;
  } catch (error) {
    console.error(`❌ Failed to get topic details for '${topicName}':`, error.message);
    return null;
  }
}

/**
 * Test producer connection
 */
async function testProducer() {
  console.log('\n📤 Testing producer connection...');
  
  try {
    const producer = kafka.producer();
    await producer.connect();
    console.log('✅ Producer connected successfully');
    
    // Send a test message
    const testMessage = {
      to: 'test@example.com',
      subject: 'Connection Test',
      message: 'This is a test message to verify producer connectivity.'
    };
    
    const result = await producer.send({
      topic: 'email-notifications',
      messages: [{
        key: 'connection-test',
        value: JSON.stringify(testMessage),
        timestamp: Date.now().toString()
      }]
    });
    
    console.log('✅ Test message sent successfully:', {
      topic: result[0].topicName,
      partition: result[0].partition,
      offset: result[0].baseOffset
    });
    
    await producer.disconnect();
    return true;
  } catch (error) {
    console.error('❌ Producer test failed:', error.message);
    return false;
  }
}

/**
 * Test consumer connection
 */
async function testConsumer() {
  console.log('\n📥 Testing consumer connection...');
  
  try {
    const consumer = kafka.consumer({
      groupId: 'kafka-connection-tester'
    });
    
    await consumer.connect();
    console.log('✅ Consumer connected successfully');
    
    await consumer.subscribe({
      topic: 'email-notifications',
      fromBeginning: false
    });
    
    console.log('✅ Consumer subscribed to topic successfully');
    
    // Test message consumption (with timeout)
    const testPromise = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Consumer test timeout - no messages received'));
      }, 5000);
      
      consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          clearTimeout(timeout);
          console.log('✅ Consumer received test message:', {
            topic,
            partition,
            offset: message.offset,
            key: message.key?.toString(),
            value: message.value?.toString()
          });
          resolve(true);
        }
      });
    });
    
    await testPromise;
    await consumer.disconnect();
    return true;
  } catch (error) {
    console.error('❌ Consumer test failed:', error.message);
    return false;
  }
}

/**
 * Run comprehensive Kafka connectivity tests
 */
async function runAllTests() {
  console.log('🚀 Kafka Connectivity Test Suite');
  console.log('=================================');
  
  const results = {
    brokerConnection: false,
    topicCreation: false,
    producerTest: false,
    consumerTest: false
  };
  
  try {
    // Test 1: Broker connection
    results.brokerConnection = await testBrokerConnection();
    
    if (!results.brokerConnection) {
      console.log('\n💥 Broker connection failed. Please check your Kafka setup.');
      return results;
    }
    
    // Test 2: List topics
    const topics = await listTopics();
    
    // Test 3: Create topic if it doesn't exist
    if (!topics.includes('email-notifications')) {
      results.topicCreation = await createTopic('email-notifications');
    } else {
      console.log('\n✅ Topic "email-notifications" already exists');
      results.topicCreation = true;
    }
    
    // Test 4: Get topic details
    await getTopicDetails('email-notifications');
    
    // Test 5: Producer test
    if (results.topicCreation) {
      results.producerTest = await testProducer();
    }
    
    // Test 6: Consumer test (only if producer test passed)
    if (results.producerTest) {
      // Wait a bit for the message to be available
      await new Promise(resolve => setTimeout(resolve, 1000));
      results.consumerTest = await testConsumer();
    }
    
    // Summary
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    console.log(`Broker Connection: ${results.brokerConnection ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Topic Creation: ${results.topicCreation ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Producer Test: ${results.producerTest ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Consumer Test: ${results.consumerTest ? '✅ PASS' : '❌ FAIL'}`);
    
    const allTestsPassed = Object.values(results).every(result => result);
    
    if (allTestsPassed) {
      console.log('\n🎉 All tests passed! Kafka is ready for the notification service.');
    } else {
      console.log('\n⚠️  Some tests failed. Please check the error messages above.');
    }
    
    return results;
  } catch (error) {
    console.error('\n💥 Test suite failed:', error.message);
    return results;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'all';
  
  try {
    switch (command) {
      case 'connection':
        await testBrokerConnection();
        break;
      
      case 'topics':
        await listTopics();
        break;
      
      case 'create':
        await createTopic(args[1] || 'email-notifications');
        break;
      
      case 'details':
        await getTopicDetails(args[1] || 'email-notifications');
        break;
      
      case 'producer':
        await testProducer();
        break;
      
      case 'consumer':
        await testConsumer();
        break;
      
      case 'all':
        await runAllTests();
        break;
      
      default:
        console.log('Usage: node test-kafka-connection.js [connection|topics|create|details|producer|consumer|all]');
        console.log('  connection - Test broker connection');
        console.log('  topics     - List all topics');
        console.log('  create     - Create email-notifications topic');
        console.log('  details    - Get topic details');
        console.log('  producer   - Test producer functionality');
        console.log('  consumer   - Test consumer functionality');
        console.log('  all        - Run all tests');
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
  testBrokerConnection,
  listTopics,
  createTopic,
  getTopicDetails,
  testProducer,
  testConsumer,
  runAllTests
};
