#!/bin/bash

# Plant Care App - CasaOS Setup Script
echo "======================================"
echo "Plant Care App - CasaOS Setup"
echo "======================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "✓ .env file created"
    echo ""
    echo "⚠️  IMPORTANT: Edit the .env file with your configuration:"
    echo "   nano .env"
    echo ""
    echo "   Required:"
    echo "   - JWT_SECRET (use a long random string)"
    echo ""
    echo "   Optional (for enhanced plant search):"
    echo "   - PERENUAL_API_KEY (https://perenual.com/docs/api)"
    echo "   - TREFLE_API_KEY (https://trefle.io/)"
    echo "   - CLAUDE_API_KEY (https://console.anthropic.com/)"
    echo ""
    read -p "Press Enter when you've configured .env file..."
else
    echo "✓ .env file already exists"
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo ""
echo "Starting deployment..."
echo ""

# Stop existing containers
echo "Stopping existing containers (if any)..."
docker-compose down 2>/dev/null

# Build and start containers
echo "Building and starting containers..."
docker-compose up -d --build

# Wait for containers to be healthy
echo ""
echo "Waiting for services to be ready..."
sleep 10

# Check container status
echo ""
echo "Container Status:"
docker-compose ps

echo ""
echo "======================================"
echo "✓ Deployment Complete!"
echo "======================================"
echo ""
echo "Access your Plant Care App:"
echo "  Frontend: http://$(hostname -I | awk '{print $1}'):3000"
echo "  Backend:  http://$(hostname -I | awk '{print $1}'):3001"
echo ""
echo "View logs:"
echo "  docker-compose logs -f"
echo ""
echo "Stop the app:"
echo "  docker-compose down"
echo ""
echo "Update the app:"
echo "  git pull origin main"
echo "  docker-compose up -d --build"
echo ""
