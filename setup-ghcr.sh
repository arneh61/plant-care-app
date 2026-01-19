#!/bin/bash

# Plant Care App - GitHub Container Registry Deployment Script
echo "=============================================="
echo "Plant Care App - GHCR Deployment"
echo "=============================================="
echo ""

# Check for GitHub username
if [ -z "$GITHUB_USERNAME" ]; then
    echo "Enter your GitHub username:"
    read -r GITHUB_USERNAME
    export GITHUB_USERNAME
fi

echo "Using GitHub username: $GITHUB_USERNAME"
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
    echo "   - JWT_SECRET (use: openssl rand -base64 32)"
    echo ""
    echo "   Optional:"
    echo "   - PERENUAL_API_KEY"
    echo "   - TREFLE_API_KEY"
    echo "   - CLAUDE_API_KEY"
    echo ""
    read -p "Press Enter when you've configured .env file..."
else
    echo "✓ .env file already exists"
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    exit 1
fi

# Check Docker Compose (V2 or V1)
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
    echo "✓ Using Docker Compose V2"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
    echo "✓ Using Docker Compose V1"
else
    echo "❌ Docker Compose is not installed"
    echo "   CasaOS should have 'docker compose' (V2) available"
    echo "   Try: docker compose version"
    exit 1
fi

echo ""
echo "Pulling pre-built images from GitHub Container Registry..."
echo "Images: ghcr.io/$GITHUB_USERNAME/plant-care-app-{backend,frontend}:latest"
echo ""

# Stop existing containers
$COMPOSE_CMD -f docker-compose.ghcr.yml down 2>/dev/null

# Pull images
if ! $COMPOSE_CMD -f docker-compose.ghcr.yml pull; then
    echo ""
    echo "❌ Failed to pull images. Common issues:"
    echo "   1. Images not yet built on GitHub (check Actions tab)"
    echo "   2. Images are private (make them public on GitHub)"
    echo "   3. Wrong GitHub username"
    echo ""
    echo "GitHub Container Registry URL:"
    echo "   https://github.com/$GITHUB_USERNAME?tab=packages"
    echo ""
    exit 1
fi

# Start containers
echo ""
echo "Starting containers..."
$COMPOSE_CMD -f docker-compose.ghcr.yml up -d

# Wait for health check
echo ""
echo "Waiting for services to be healthy..."
sleep 15

# Check status
echo ""
echo "Container Status:"
$COMPOSE_CMD -f docker-compose.ghcr.yml ps

echo ""
echo "=============================================="
echo "✓ Deployment Complete!"
echo "=============================================="
echo ""
echo "Access your Plant Care App:"
echo "  Frontend: http://$(hostname -I | awk '{print $1}'):3000"
echo "  Backend:  http://$(hostname -I | awk '{print $1}'):3001"
echo ""
echo "View logs:"
echo "  $COMPOSE_CMD -f docker-compose.ghcr.yml logs -f"
echo ""
echo "Update images:"
echo "  $COMPOSE_CMD -f docker-compose.ghcr.yml pull"
echo "  $COMPOSE_CMD -f docker-compose.ghcr.yml up -d"
echo ""
