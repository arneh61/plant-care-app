# Plant Care App - CasaOS Deployment Guide

This guide walks you through deploying the Plant Care App on your CasaOS server.

## Prerequisites

- CasaOS installed and running
- SSH access to your CasaOS server
- GitHub account (for version control and easy updates)
- Basic Linux command line knowledge

## Quick Start

### 1. Connect to Your CasaOS Server

```bash
ssh your-username@your-casaos-ip
```

### 2. Clone from GitHub

```bash
cd /DATA/AppData
git clone https://github.com/YOUR_USERNAME/plant-care-app.git
cd plant-care-app
```

### 3. Run Setup Script

```bash
chmod +x setup-casaos.sh
./setup-casaos.sh
```

### 4. Access Your App

- Frontend: `http://your-casaos-ip:3000`
- Backend: `http://your-casaos-ip:3001`

## Detailed Setup Instructions

### Pushing to GitHub First

1. **Create GitHub Repository**
   - Go to https://github.com/new
   - Name: `plant-care-app`
   - Visibility: Private or Public
   - Don't initialize with README
   - Click "Create repository"

2. **Push Your Local Code**

```bash
cd plant-care-app
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/plant-care-app.git
git branch -M main
git push -u origin main
```

### Configuring Environment Variables

Edit `.env` file on your CasaOS server:

```bash
nano .env
```

**Required:**
```env
JWT_SECRET=your-long-random-secret-string
```

Generate secure secret:
```bash
openssl rand -base64 32
```

**Optional (for enhanced plant search):**
```env
PERENUAL_API_KEY=your_key_here
TREFLE_API_KEY=your_key_here
CLAUDE_API_KEY=your_key_here
```

Get API keys:
- Perenual: https://perenual.com/docs/api
- Trefle: https://trefle.io/
- Claude: https://console.anthropic.com/

## Common Commands

### View Logs
```bash
docker-compose logs -f
```

### Stop/Start
```bash
docker-compose down
docker-compose up -d
```

### Update from GitHub
```bash
git pull origin main
docker-compose up -d --build
```

### Backup Data
```bash
mkdir -p ~/backups/plant-care
docker cp plant-care-backend:/app/data/plants.db ~/backups/plant-care/
docker cp plant-care-backend:/app/data/uploads ~/backups/plant-care/uploads
```

### Restore from Backup
```bash
docker-compose down
docker cp ~/backups/plant-care/plants.db plant-care-backend:/app/data/
docker cp ~/backups/plant-care/uploads plant-care-backend:/app/data/
docker-compose up -d
```

## Troubleshooting

### Containers won't start
```bash
docker-compose logs backend
docker-compose logs frontend
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### Can't access app
```bash
# Check if ports are listening
netstat -tlnp | grep 3000
netstat -tlnp | grep 3001

# Allow ports through firewall
ufw allow 3000/tcp
ufw allow 3001/tcp
```

### Database errors
```bash
docker-compose down
docker volume rm plant-care-app_plant_data
docker-compose up -d
```

## Port Configuration

If ports 3000/3001 are in use, edit `docker-compose.yml`:

```yaml
services:
  backend:
    ports:
      - "3002:3001"
  frontend:
    ports:
      - "3100:80"
```

## Adding to CasaOS Dashboard

1. Open CasaOS web interface
2. Go to App Store or Custom Install
3. Add bookmark to `http://your-casaos-ip:3000`
4. Set icon: 🪴
5. Set name: Plant Care

## Security Best Practices

1. Use strong JWT_SECRET
2. Keep .env file secure (never commit to git)
3. Regular backups
4. Update regularly with `git pull`
5. Use HTTPS via reverse proxy if exposing to internet
6. Consider using Tailscale/Wireguard VPN for remote access

## Resource Usage

- RAM: ~400MB total
- Storage: ~500MB + your data
- CPU: Minimal

Check usage:
```bash
docker stats plant-care-backend plant-care-frontend
```

## FAQ

**Q: Do I need all API keys?**
A: No. Only JWT_SECRET is required.

**Q: Can I change ports?**
A: Yes, edit docker-compose.yml and rebuild.

**Q: How do I add users?**
A: Users register through the web interface.

**Q: Can multiple people share a collection?**
A: Yes, use the invite feature.

For more help, see README.md or create a GitHub issue.
