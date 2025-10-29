#!/bin/bash

# Kafka Setup Script for Windows (PowerShell compatible)
# This script helps set up Kafka with proper troubleshooting

echo "🚀 Kafka Setup Script"
echo "===================="

# Function to check if Docker is running
check_docker() {
    echo "🔍 Checking Docker status..."
    if docker info > /dev/null 2>&1; then
        echo "✅ Docker is running"
        return 0
    else
        echo "❌ Docker is not running or not accessible"
        echo "Please start Docker Desktop and try again"
        return 1
    fi
}

# Function to stop existing containers
cleanup_containers() {
    echo "🧹 Cleaning up existing containers..."
    docker-compose down -v 2>/dev/null || true
    docker stop kafka zookeeper kafka-ui 2>/dev/null || true
    docker rm kafka zookeeper kafka-ui 2>/dev/null || true
    echo "✅ Cleanup completed"
}

# Function to start Kafka with Confluent Platform
start_confluent_kafka() {
    echo "📦 Starting Kafka with Confluent Platform..."
    docker-compose up -d
    
    echo "⏳ Waiting for services to start..."
    sleep 10
    
    # Check if services are running
    if docker ps | grep -q kafka && docker ps | grep -q zookeeper; then
        echo "✅ Confluent Kafka started successfully"
        return 0
    else
        echo "❌ Confluent Kafka failed to start"
        return 1
    fi
}

# Function to start Kafka with Apache Kafka (Bitnami)
start_apache_kafka() {
    echo "📦 Starting Kafka with Apache Kafka (Bitnami)..."
    docker-compose -f docker-compose-apache.yml up -d
    
    echo "⏳ Waiting for services to start..."
    sleep 15
    
    # Check if services are running
    if docker ps | grep -q kafka && docker ps | grep -q zookeeper; then
        echo "✅ Apache Kafka started successfully"
        return 0
    else
        echo "❌ Apache Kafka failed to start"
        return 1
    fi
}

# Function to verify Kafka is working
verify_kafka() {
    echo "🔍 Verifying Kafka functionality..."
    
    # Wait a bit more for Kafka to be fully ready
    sleep 5
    
    # Test if we can list topics
    if docker exec kafka kafka-topics --bootstrap-server localhost:9092 --list 2>/dev/null; then
        echo "✅ Kafka is responding to commands"
        return 0
    else
        echo "❌ Kafka is not responding to commands"
        return 1
    fi
}

# Function to create test topic
create_test_topic() {
    echo "📝 Creating test topic..."
    
    # Create the email-notifications topic
    docker exec kafka kafka-topics \
        --bootstrap-server localhost:9092 \
        --create \
        --topic email-notifications \
        --partitions 1 \
        --replication-factor 1 2>/dev/null
    
    if [ $? -eq 0 ]; then
        echo "✅ Topic 'email-notifications' created successfully"
    else
        echo "ℹ️  Topic might already exist or auto-creation is enabled"
    fi
    
    # List all topics
    echo "📋 Available topics:"
    docker exec kafka kafka-topics --bootstrap-server localhost:9092 --list
}

# Function to test message sending
test_message_sending() {
    echo "📤 Testing message sending..."
    
    # Send a test message
    echo '{"to": "test@example.com", "subject": "Test Message", "message": "This is a test message from Kafka setup script"}' | \
    docker exec -i kafka kafka-console-producer \
        --bootstrap-server localhost:9092 \
        --topic email-notifications
    
    if [ $? -eq 0 ]; then
        echo "✅ Test message sent successfully"
        
        # Try to consume the message
        echo "📥 Consuming test message..."
        timeout 5 docker exec kafka kafka-console-consumer \
            --bootstrap-server localhost:9092 \
            --topic email-notifications \
            --from-beginning \
            --max-messages 1 2>/dev/null
        
        echo "✅ Message consumption test completed"
    else
        echo "❌ Failed to send test message"
    fi
}

# Function to show service status
show_status() {
    echo "📊 Service Status:"
    echo "=================="
    docker-compose ps 2>/dev/null || docker-compose -f docker-compose-apache.yml ps
    
    echo ""
    echo "🌐 Service URLs:"
    echo "Kafka Broker: localhost:9092"
    echo "Kafka UI: http://localhost:8080"
    echo "Zookeeper: localhost:2181"
}

# Function to show logs
show_logs() {
    echo "📋 Recent Kafka logs:"
    echo "===================="
    docker logs kafka --tail 20 2>/dev/null || echo "No Kafka logs available"
}

# Main execution
main() {
    echo "Starting Kafka setup process..."
    
    # Check Docker
    if ! check_docker; then
        exit 1
    fi
    
    # Cleanup existing containers
    cleanup_containers
    
    # Try Confluent Platform first
    if start_confluent_kafka; then
        echo "🎉 Confluent Kafka setup successful!"
        KAFKA_TYPE="confluent"
    else
        echo "⚠️  Confluent Kafka failed, trying Apache Kafka..."
        cleanup_containers
        
        if start_apache_kafka; then
            echo "🎉 Apache Kafka setup successful!"
            KAFKA_TYPE="apache"
        else
            echo "❌ Both Kafka setups failed"
            show_logs
            exit 1
        fi
    fi
    
    # Verify Kafka is working
    if verify_kafka; then
        echo "✅ Kafka verification successful"
    else
        echo "❌ Kafka verification failed"
        show_logs
        exit 1
    fi
    
    # Create test topic
    create_test_topic
    
    # Test message sending
    test_message_sending
    
    # Show final status
    show_status
    
    echo ""
    echo "🎉 Kafka setup completed successfully!"
    echo "You can now run your notification microservice with:"
    echo "  npm start"
    echo ""
    echo "To test the setup:"
    echo "  npm run test:kafka"
    echo "  npm run test:send"
}

# Handle command line arguments
case "${1:-}" in
    "cleanup")
        cleanup_containers
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs
        ;;
    "test")
        verify_kafka
        create_test_topic
        test_message_sending
        ;;
    *)
        main
        ;;
esac
