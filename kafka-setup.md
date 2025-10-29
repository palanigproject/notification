# Kafka Setup Guide for Windows

This guide provides multiple ways to set up Kafka for testing the notification microservice.

## Option 1: Using Docker Compose (Recommended)

### Prerequisites
- Docker Desktop installed on Windows
- Docker Compose v2.0+

### Quick Setup with Docker Compose

1. **Create Docker Compose file** (already provided below)
2. **Start Kafka and Zookeeper**:
   ```bash
   docker-compose up -d
   ```
3. **Verify services are running**:
   ```bash
   docker-compose ps
   ```

### Docker Compose Configuration

Create `docker-compose.yml` in your project root:

```yaml
version: '3.8'

services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.4.0
    hostname: zookeeper
    container_name: zookeeper
    ports:
      - "2181:2181"
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000

  kafka:
    image: confluentinc/cp-kafka:7.4.0
    hostname: kafka
    container_name: kafka
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
      - "9101:9101"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: 'zookeeper:2181'
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: PLAINTEXT:PLAINTEXT,PLAINTEXT_HOST:PLAINTEXT
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:29092,PLAINTEXT_HOST://localhost:9092
      KAFKA_METRIC_REPORTERS: io.confluent.metrics.reporter.ConfluentMetricsReporter
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: 0
      KAFKA_CONFLUENT_METRICS_REPORTER_BOOTSTRAP_SERVERS: kafka:29092
      KAFKA_CONFLUENT_METRICS_REPORTER_TOPIC_REPLICAS: 1
      KAFKA_CONFLUENT_METRICS_ENABLE: 'true'
      KAFKA_CONFLUENT_SUPPORT_CUSTOMER_ID: anonymous
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: 'true'

  kafka-ui:
    image: provectuslabs/kafka-ui:latest
    container_name: kafka-ui
    depends_on:
      - kafka
    ports:
      - "8080:8080"
    environment:
      KAFKA_CLUSTERS_0_NAME: local
      KAFKA_CLUSTERS_0_BOOTSTRAPSERVERS: kafka:29092
      KAFKA_CLUSTERS_0_ZOOKEEPER: zookeeper:2181
```

## Option 2: Manual Kafka Installation on Windows

### Prerequisites
- Java 11 or higher installed
- PowerShell or Command Prompt

### Installation Steps

1. **Download Kafka**:
   ```powershell
   # Create kafka directory
   mkdir C:\kafka
   cd C:\kafka
   
   # Download Kafka (adjust version as needed)
   Invoke-WebRequest -Uri "https://downloads.apache.org/kafka/2.13-3.6.0/kafka_2.13-3.6.0.tgz" -OutFile "kafka.tgz"
   
   # Extract (you may need 7-Zip or similar)
   tar -xzf kafka.tgz
   cd kafka_2.13-3.6.0
   ```

2. **Start Zookeeper**:
   ```powershell
   # In first PowerShell window
   .\bin\windows\zookeeper-server-start.bat .\config\zookeeper.properties
   ```

3. **Start Kafka**:
   ```powershell
   # In second PowerShell window
   .\bin\windows\kafka-server-start.bat .\config\server.properties
   ```

## Option 3: Using Confluent Platform

1. **Download Confluent Platform**:
   - Visit: https://www.confluent.io/download/
   - Download Confluent Platform Community Edition

2. **Install and Start**:
   ```powershell
   # Extract and navigate to confluent directory
   cd confluent-7.4.0
   
   # Start all services
   .\bin\confluent start
   ```

## Verification

### Check if Kafka is running:

```bash
# Using Docker
docker exec -it kafka kafka-topics --bootstrap-server localhost:9092 --list

# Using manual installation
.\bin\windows\kafka-topics.bat --bootstrap-server localhost:9092 --list
```

### Create test topic:

```bash
# Create topic
kafka-topics --bootstrap-server localhost:9092 --create --topic email-notifications --partitions 1 --replication-factor 1

# List topics
kafka-topics --bootstrap-server localhost:9092 --list
```

## Troubleshooting

### Common Issues:

1. **Port conflicts**: Ensure ports 9092 and 2181 are available
2. **Java not found**: Install Java 11+ and set JAVA_HOME
3. **Firewall issues**: Allow Kafka ports through Windows Firewall
4. **Memory issues**: Increase JVM heap size in kafka-server-start.bat

### Health Checks:

```bash
# Check Zookeeper
telnet localhost 2181

# Check Kafka
telnet localhost 9092

# Check topic creation
kafka-topics --bootstrap-server localhost:9092 --describe --topic email-notifications
```
