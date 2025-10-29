# Kafka Setup Script for Windows PowerShell
# This script helps set up Kafka with proper troubleshooting

Write-Host "🚀 Kafka Setup Script" -ForegroundColor Green
Write-Host "====================" -ForegroundColor Green

# Function to check if Docker is running
function Test-Docker {
    Write-Host "🔍 Checking Docker status..." -ForegroundColor Yellow
    
    try {
        docker info | Out-Null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Docker is running" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Docker is not running or not accessible" -ForegroundColor Red
            Write-Host "Please start Docker Desktop and try again" -ForegroundColor Yellow
            return $false
        }
    } catch {
        Write-Host "❌ Docker is not running or not accessible" -ForegroundColor Red
        Write-Host "Please start Docker Desktop and try again" -ForegroundColor Yellow
        return $false
    }
}

# Function to stop existing containers
function Clear-Containers {
    Write-Host "🧹 Cleaning up existing containers..." -ForegroundColor Yellow
    
    try {
        docker-compose down -v 2>$null
        docker-compose -f docker-compose-apache.yml down -v 2>$null
        docker stop kafka zookeeper kafka-ui 2>$null
        docker rm kafka zookeeper kafka-ui 2>$null
        Write-Host "✅ Cleanup completed" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  Some containers might not exist, continuing..." -ForegroundColor Yellow
    }
}

# Function to start Kafka with Confluent Platform
function Start-ConfluentKafka {
    Write-Host "📦 Starting Kafka with Confluent Platform..." -ForegroundColor Yellow
    
    try {
        docker-compose up -d
        
        Write-Host "⏳ Waiting for services to start..." -ForegroundColor Yellow
        Start-Sleep -Seconds 15
        
        # Check if services are running
        $kafkaRunning = docker ps --filter "name=kafka" --filter "status=running" | Select-String "kafka"
        $zookeeperRunning = docker ps --filter "name=zookeeper" --filter "status=running" | Select-String "zookeeper"
        
        if ($kafkaRunning -and $zookeeperRunning) {
            Write-Host "✅ Confluent Kafka started successfully" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Confluent Kafka failed to start" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Confluent Kafka failed to start: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to start Kafka with Apache Kafka (Bitnami)
function Start-ApacheKafka {
    Write-Host "📦 Starting Kafka with Apache Kafka (Bitnami)..." -ForegroundColor Yellow
    
    try {
        docker-compose -f docker-compose-apache.yml up -d
        
        Write-Host "⏳ Waiting for services to start..." -ForegroundColor Yellow
        Start-Sleep -Seconds 20
        
        # Check if services are running
        $kafkaRunning = docker ps --filter "name=kafka" --filter "status=running" | Select-String "kafka"
        $zookeeperRunning = docker ps --filter "name=zookeeper" --filter "status=running" | Select-String "zookeeper"
        
        if ($kafkaRunning -and $zookeeperRunning) {
            Write-Host "✅ Apache Kafka started successfully" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Apache Kafka failed to start" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Apache Kafka failed to start: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to verify Kafka is working
function Test-Kafka {
    Write-Host "🔍 Verifying Kafka functionality..." -ForegroundColor Yellow
    
    try {
        # Wait a bit more for Kafka to be fully ready
        Start-Sleep -Seconds 5
        
        # Test if we can list topics
        $result = docker exec kafka kafka-topics --bootstrap-server localhost:9092 --list 2>$null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Kafka is responding to commands" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Kafka is not responding to commands" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Kafka verification failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Function to create test topic
function New-TestTopic {
    Write-Host "📝 Creating test topic..." -ForegroundColor Yellow
    
    try {
        # Create the email-notifications topic
        docker exec kafka kafka-topics --bootstrap-server localhost:9092 --create --topic email-notifications --partitions 1 --replication-factor 1 2>$null
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Topic 'email-notifications' created successfully" -ForegroundColor Green
        } else {
            Write-Host "ℹ️  Topic might already exist or auto-creation is enabled" -ForegroundColor Cyan
        }
        
        # List all topics
        Write-Host "📋 Available topics:" -ForegroundColor Yellow
        docker exec kafka kafka-topics --bootstrap-server localhost:9092 --list
    } catch {
        Write-Host "❌ Failed to create test topic: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Function to test message sending
function Test-MessageSending {
    Write-Host "📤 Testing message sending..." -ForegroundColor Yellow
    
    try {
        # Create test message
        $testMessage = '{"to": "palanig.project@gmail.com", "subject": "Test Message", "message": "This is a test message from Kafka setup script"}'
        
        # Send test message
        $testMessage | docker exec -i kafka kafka-console-producer --bootstrap-server localhost:9092 --topic email-notifications
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Test message sent successfully" -ForegroundColor Green
            
            # Try to consume the message
            Write-Host "📥 Consuming test message..." -ForegroundColor Yellow
            $timeout = 5
            $job = Start-Job -ScriptBlock {
                docker exec kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic email-notifications --from-beginning --max-messages 1
            }
            
            $job | Wait-Job -Timeout $timeout | Out-Null
            $result = $job | Receive-Job
            $job | Remove-Job
            
            Write-Host "✅ Message consumption test completed" -ForegroundColor Green
        } else {
            Write-Host "❌ Failed to send test message" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Message sending test failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Function to show service status
function Show-Status {
    Write-Host "📊 Service Status:" -ForegroundColor Yellow
    Write-Host "==================" -ForegroundColor Yellow
    
    try {
        docker-compose ps 2>$null
    } catch {
        try {
            docker-compose -f docker-compose-apache.yml ps 2>$null
        } catch {
            Write-Host "Could not get service status" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "🌐 Service URLs:" -ForegroundColor Yellow
    Write-Host "Kafka Broker: localhost:9092" -ForegroundColor Cyan
    Write-Host "Kafka UI: http://localhost:8080" -ForegroundColor Cyan
    Write-Host "Zookeeper: localhost:2181" -ForegroundColor Cyan
}

# Function to show logs
function Show-Logs {
    Write-Host "📋 Recent Kafka logs:" -ForegroundColor Yellow
    Write-Host "====================" -ForegroundColor Yellow
    
    try {
        docker logs kafka --tail 20 2>$null
    } catch {
        Write-Host "No Kafka logs available" -ForegroundColor Red
    }
}

# Main execution function
function Start-KafkaSetup {
    Write-Host "Starting Kafka setup process..." -ForegroundColor Green
    
    # Check Docker
    if (-not (Test-Docker)) {
        exit 1
    }
    
    # Cleanup existing containers
    Clear-Containers
    
    # Try Confluent Platform first
    if (Start-ConfluentKafka) {
        Write-Host "🎉 Confluent Kafka setup successful!" -ForegroundColor Green
        $script:KafkaType = "confluent"
    } else {
        Write-Host "⚠️  Confluent Kafka failed, trying Apache Kafka..." -ForegroundColor Yellow
        Clear-Containers
        
        if (Start-ApacheKafka) {
            Write-Host "🎉 Apache Kafka setup successful!" -ForegroundColor Green
            $script:KafkaType = "apache"
        } else {
            Write-Host "❌ Both Kafka setups failed" -ForegroundColor Red
            Show-Logs
            exit 1
        }
    }
    
    # Verify Kafka is working
    if (Test-Kafka) {
        Write-Host "✅ Kafka verification successful" -ForegroundColor Green
    } else {
        Write-Host "❌ Kafka verification failed" -ForegroundColor Red
        Show-Logs
        exit 1
    }
    
    # Create test topic
    New-TestTopic
    
    # Test message sending
    Test-MessageSending
    
    # Show final status
    Show-Status
    
    Write-Host ""
    Write-Host "🎉 Kafka setup completed successfully!" -ForegroundColor Green
    Write-Host "You can now run your notification microservice with:" -ForegroundColor Cyan
    Write-Host "  npm start" -ForegroundColor White
    Write-Host ""
    Write-Host "To test the setup:" -ForegroundColor Cyan
    Write-Host "  npm run test:kafka" -ForegroundColor White
    Write-Host "  npm run test:send" -ForegroundColor White
}

# Handle command line arguments
param(
    [string]$Action = "setup"
)

switch ($Action.ToLower()) {
    "cleanup" {
        Clear-Containers
    }
    "status" {
        Show-Status
    }
    "logs" {
        Show-Logs
    }
    "test" {
        Test-Kafka
        New-TestTopic
        Test-MessageSending
    }
    "setup" {
        Start-KafkaSetup
    }
    default {
        Write-Host "Usage: .\setup-kafka.ps1 [setup|cleanup|status|logs|test]" -ForegroundColor Yellow
        Write-Host "  setup   - Complete Kafka setup (default)" -ForegroundColor Cyan
        Write-Host "  cleanup - Clean up existing containers" -ForegroundColor Cyan
        Write-Host "  status  - Show service status" -ForegroundColor Cyan
        Write-Host "  logs    - Show Kafka logs" -ForegroundColor Cyan
        Write-Host "  test    - Test Kafka functionality" -ForegroundColor Cyan
    }
}
