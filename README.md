# Email Notification Microservice

A Node.js microservice that consumes Kafka messages and sends emails using SMTP or AWS SES. The service processes messages from a Kafka topic and sends notification emails based on the message content.

## Features

- **Kafka Integration**: Consumes messages from Kafka topics using KafkaJS
- **Multiple Email Providers**: Supports both SMTP and AWS SES email providers
- **Error Handling**: Comprehensive error handling with retry logic
- **Structured Logging**: Uses Winston for structured logging
- **Graceful Shutdown**: Handles shutdown signals gracefully
- **Message Validation**: Validates Kafka message structure and email addresses
- **Retry Logic**: Implements retry logic for transient failures

## Prerequisites

- Node.js v18 or higher
- Kafka cluster running and accessible
- SMTP server or AWS SES account (depending on email provider choice)

## Installation

1. Clone the repository or download the source files
2. Install dependencies:

```bash
npm install
```

3. Copy the environment example file and configure your settings:

```bash
cp env.example .env
```

4. Edit the `.env` file with your configuration:

```env
# Kafka Configuration
KAFKA_BROKER=localhost:9092
KAFKA_GROUP_ID=email-service-group
KAFKA_TOPIC=email-notifications

# Email Provider Configuration (SMTP or SES)
EMAIL_PROVIDER=SMTP

# SMTP Configuration
MAIL_HOST=smtp.office365.com
MAIL_PORT=587
MAIL_USER=noreply@domain.com
MAIL_PASS=your_password
MAIL_FROM="Notifier noreply@domain.com"

# AWS SES Configuration (when EMAIL_PROVIDER=SES)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key

# Application Configuration
NODE_ENV=development
LOG_LEVEL=info
```

## Configuration

### Environment Variables

#### Required Variables

- `KAFKA_BROKER`: Kafka broker address (e.g., `localhost:9092`)
- `KAFKA_GROUP_ID`: Kafka consumer group ID
- `KAFKA_TOPIC`: Kafka topic name to consume messages from
- `EMAIL_PROVIDER`: Email provider type (`SMTP` or `SES`)

#### SMTP Configuration (when EMAIL_PROVIDER=SMTP)

- `MAIL_HOST`: SMTP server hostname
- `MAIL_PORT`: SMTP server port (587 for TLS, 465 for SSL)
- `MAIL_USER`: SMTP username
- `MAIL_PASS`: SMTP password
- `MAIL_FROM`: From email address (optional, defaults to MAIL_USER)

#### AWS SES Configuration (when EMAIL_PROVIDER=SES)

- `AWS_REGION`: AWS region for SES
- `AWS_ACCESS_KEY_ID`: AWS access key ID
- `AWS_SECRET_ACCESS_KEY`: AWS secret access key

#### Optional Variables

- `NODE_ENV`: Environment (development, production)
- `LOG_LEVEL`: Logging level (error, warn, info, debug)

## Message Format

The service expects Kafka messages with the following JSON structure:

```json
{
  "to": "recipient@example.com",
  "subject": "Email Subject",
  "message": "HTML or plain text message content"
}
```

### Message Fields

- `to` (required): Recipient email address
- `subject` (required): Email subject line
- `message` (required): Email content (HTML or plain text)

## Running the Service

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

### Using Node.js directly

```bash
node src/index.js
```

## Project Structure

```
src/
├── config/
│   ├── kafka.js          # Kafka client and consumer configuration
│   ├── logger.js         # Winston logger configuration
│   └── mail.js           # Email transporter configuration
├── services/
│   └── emailService.js   # Email sending service
├── consumers/
│   └── notificationConsumer.js  # Kafka message consumer
└── index.js              # Main application entry point
```

## Error Handling

The service includes comprehensive error handling:

- **Message Parsing Errors**: Invalid JSON or missing fields
- **Email Validation**: Email address format validation
- **Transient Failures**: Retry logic for network issues
- **Connection Issues**: Automatic reconnection to Kafka
- **Graceful Shutdown**: Proper cleanup on service termination

## Logging

The service uses Winston for structured logging with the following levels:

- `error`: Error conditions
- `warn`: Warning conditions
- `info`: Informational messages
- `debug`: Debug-level messages

Logs include:
- Message processing details
- Email sending results
- Error conditions and stack traces
- Service lifecycle events

## Monitoring

The service provides health status information including:

- Service status
- Uptime
- Memory usage
- Consumer running status

## Development

### Adding New Email Providers

To add support for additional email providers:

1. Modify `src/config/mail.js` to add the new provider
2. Update the `getMailTransporter()` function
3. Add required environment variables to `env.example`

### Testing

The service can be tested by sending messages to the configured Kafka topic. Use Kafka tools or a simple producer to send test messages.

## Troubleshooting

### Common Issues

1. **Kafka Connection Failed**
   - Verify Kafka broker is running and accessible
   - Check network connectivity
   - Verify KAFKA_BROKER environment variable

2. **Email Sending Failed**
   - Verify SMTP/SES credentials
   - Check email provider configuration
   - Review firewall settings for SMTP ports

3. **Message Processing Errors**
   - Verify message JSON format
   - Check required fields are present
   - Validate email address format

### Logs

Check the application logs for detailed error information:

```bash
# Development
npm run dev

# Production (with file logging)
NODE_ENV=production npm start
```

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues and questions, please check the logs first and then create an issue in the repository.
