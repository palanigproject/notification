# Complete Testing Guide for Notification Microservice

This guide provides step-by-step instructions to test the notification microservice with Kafka.

## Prerequisites

1. **Node.js v18+** installed
2. **Docker Desktop** (recommended) or **Kafka manually installed**
3. **SMTP server** or **AWS SES account** for email sending

## Quick Start Testing (Docker)

### Step 1: Start Kafka with Docker

**Option A: Using the automated setup script (Recommended)**
```bash
# Windows PowerShell
.\setup-kafka.ps1

# Linux/Mac
chmod +x setup-kafka.sh
./setup-kafka.sh
```

**Option B: Manual Docker Compose**
```bash
# Try the fixed Confluent setup first
docker-compose up -d

# If that fails, try the Apache Kafka setup
docker-compose -f docker-compose-apache.yml up -d

# Verify services are running
docker-compose ps
```

You should see:
- `kafka` container running on port 9092
- `zookeeper` container running on port 2181
- `kafka-ui` container running on port 8080 (optional web UI)

**If you encounter the ConfluentMetricsReporter error:**
The issue you experienced is due to missing Confluent-specific dependencies. The fixed `docker-compose.yml` removes these dependencies. If you still have issues, use the Apache Kafka setup with `docker-compose-apache.yml`.

### Step 2: Install Dependencies

```bash
# Install Node.js dependencies
npm install
```

### Step 3: Configure Environment

```bash
# Copy environment template
cp env.example .env

# Edit .env with your email settings
# For testing, you can use a service like Mailtrap or your SMTP server
```

**Example .env for testing:**
```env
KAFKA_BROKER=localhost:9092
KAFKA_GROUP_ID=email-service-group
KAFKA_TOPIC=email-notifications
EMAIL_PROVIDER=SMTP
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password
MAIL_FROM="Test Notifier your-email@gmail.com"
NODE_ENV=development
LOG_LEVEL=info
```

### Step 4: Test Kafka Connection

```bash
# Run comprehensive Kafka tests
node test-scripts/test-kafka-connection.js all
```

Expected output:
```
🚀 Kafka Connectivity Test Suite
=================================
✅ Successfully connected to Kafka broker
✅ Topic "email-notifications" created successfully
✅ Producer test passed
✅ Consumer test passed
🎉 All tests passed! Kafka is ready for the notification service.
```

### Step 5: Start the Notification Service

```bash
# Start the microservice
npm start
```

Expected output:
```
Starting Email Notification Microservice...
✅ Kafka client created successfully
✅ Consumer connected to Kafka cluster successfully
✅ Email service initialized successfully
🎉 Email Notification Microservice started successfully
```

### Step 6: Send Test Messages

**Option A: Send single test message**
```bash
node test-scripts/send-test-message.js single
```

**Option B: Send multiple test messages**
```bash
node test-scripts/send-test-message.js multiple
```

**Option C: Send invalid messages (to test error handling)**
```bash
node test-scripts/send-test-message.js invalid
```

**Option D: Run all test scenarios**
```bash
node test-scripts/send-test-message.js all
```

## Detailed Testing Scenarios

### Scenario 1: Valid Email Message

**Test Message:**
```json
{
  "to": "test@example.com",
  "subject": "Welcome Email",
  "message": "<h1>Welcome!</h1><p>Thank you for joining our service.</p>"
}
```

**Expected Result:**
- Message consumed successfully
- Email sent via configured provider
- Success logged in console

### Scenario 2: Multiple Messages

**Test:** Send 4 different email messages with 2-second delays

**Expected Result:**
- All messages processed sequentially
- Each email sent successfully
- Processing logs for each message

### Scenario 3: Invalid Message Handling

**Test Invalid Messages:**
1. Missing required fields
2. Invalid email format
3. Empty message content

**Expected Result:**
- Errors logged gracefully
- Service continues processing other messages
- No crashes or service interruption

### Scenario 4: Error Recovery

**Test:** Disconnect Kafka and reconnect

**Expected Result:**
- Service detects disconnection
- Attempts reconnection automatically
- Resumes message processing after reconnection

## Manual Testing with Kafka Tools

### Using Kafka CLI Tools

**Create topic manually:**
```bash
docker exec -it kafka kafka-topics --bootstrap-server localhost:9092 --create --topic email-notifications --partitions 1 --replication-factor 1
```

**Send message manually:**
```bash
docker exec -it kafka kafka-console-producer --bootstrap-server localhost:9092 --topic email-notifications
```

Then paste:
```json
{"to": "manual@test.com", "subject": "Manual Test", "message": "This is a manual test message"}
```

**Consume messages manually:**
```bash
docker exec -it kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic email-notifications --from-beginning
```

### Using Kafka UI (Web Interface)

1. Open http://localhost:8080 in your browser
2. Navigate to Topics → email-notifications
3. Use the "Produce" tab to send messages
4. Use the "Consume" tab to view messages

## Testing Different Email Providers

### Testing with SMTP (Gmail)

```env
EMAIL_PROVIDER=SMTP
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password
MAIL_FROM="Test Notifier your-email@gmail.com"
```

**Note:** For Gmail, use an App Password, not your regular password.

### Testing with SMTP (Office 365)

```env
EMAIL_PROVIDER=SMTP
MAIL_HOST=smtp.office365.com
MAIL_PORT=587
MAIL_USER=your-email@yourdomain.com
MAIL_PASS=your-password
MAIL_FROM="Test Notifier your-email@yourdomain.com"
```

### Testing with AWS SES

```env
EMAIL_PROVIDER=SES
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
MAIL_FROM="Test Notifier verified-email@yourdomain.com"
```

## Monitoring and Logs

### View Service Logs

```bash
# Development mode with detailed logs
npm run dev

# Production mode
npm start
```

### Log Levels

Set `LOG_LEVEL` in .env to control logging:
- `error` - Only errors
- `warn` - Warnings and errors
- `info` - Info, warnings, and errors (default)
- `debug` - All messages including debug info

### Key Log Messages to Monitor

**Successful Processing:**
```
✅ Message processed successfully
✅ Email sent successfully
```

**Error Handling:**
```
❌ Failed to process message
❌ Failed to send email
⚠️ Message processing error
```

## Performance Testing

### Load Testing Script

Create `test-scripts/load-test.js`:

```javascript
const { sendMultipleTestMessages, testMessages } = require('./send-test-message');

// Send 100 messages rapidly
const loadTestMessages = Array(100).fill().map((_, i) => ({
  ...testMessages[i % testMessages.length],
  to: `loadtest${i}@example.com`,
  subject: `Load Test Message ${i + 1}`
}));

async function runLoadTest() {
  console.log('🚀 Starting load test with 100 messages...');
  await sendMultipleTestMessages(loadTestMessages, 'email-notifications', 100);
  console.log('✅ Load test completed');
}

runLoadTest().catch(console.error);
```

Run load test:
```bash
node test-scripts/load-test.js
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Kafka Connection Failed
```
❌ Failed to connect to Kafka broker
```

**Solutions:**
- Check if Kafka is running: `docker-compose ps`
- Verify port 9092 is not blocked
- Check KAFKA_BROKER environment variable

#### 2. Email Sending Failed
```
❌ Failed to send email
```

**Solutions:**
- Verify email provider credentials
- Check SMTP server settings
- Ensure email provider allows the connection
- Check firewall settings

#### 3. Topic Not Found
```
❌ Topic 'email-notifications' not found
```

**Solutions:**
- Create topic manually: `node test-scripts/test-kafka-connection.js create`
- Check topic name in environment variables
- Verify Kafka auto-create-topics is enabled

#### 4. Consumer Group Issues
```
❌ Consumer group rebalancing failed
```

**Solutions:**
- Change KAFKA_GROUP_ID in .env
- Restart the service
- Check for multiple instances running

### Health Checks

**Check service health:**
```bash
# The service logs its health status on startup
# Look for: "Email Notification Microservice started successfully"
```

**Check Kafka health:**
```bash
# Test Kafka connectivity
node test-scripts/test-kafka-connection.js connection
```

**Check email service health:**
```bash
# Look for: "Email service initialized successfully"
# Check logs for SMTP/SES connection verification
```

## Production Deployment Testing

### Environment Setup
```env
NODE_ENV=production
LOG_LEVEL=info
```

### Security Testing
- Verify environment variables are not logged
- Test with invalid credentials
- Verify graceful error handling

### Scaling Testing
- Run multiple service instances
- Test consumer group behavior
- Verify message distribution

## Test Results Validation

### Success Criteria
- ✅ All test messages processed successfully
- ✅ Emails sent and received
- ✅ Error handling works correctly
- ✅ Service recovers from failures
- ✅ Logs are structured and informative

### Performance Benchmarks
- Message processing time < 5 seconds
- Email sending time < 10 seconds
- Service startup time < 30 seconds
- Memory usage stable over time

This comprehensive testing guide ensures your notification microservice is working correctly and ready for production use!
