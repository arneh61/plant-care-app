# CasaOS Command Reference

Quick reference for managing your Plant Care App on CasaOS.

## Important: Docker Compose V2

CasaOS uses **Docker Compose V2** which uses a **space** instead of a hyphen:

✅ **Correct:** `docker compose` (with space)
❌ **Wrong:** `docker-compose` (with hyphen)

All scripts have been updated to automatically detect and use the correct version.

## Quick Deployment

### Using Pre-built Images (GHCR - Recommended)

```bash
# SSH to CasaOS
ssh user@casaos-ip
cd /DATA/AppData

# Clone repository
git clone https://github.com/YOUR_USERNAME/plant-care-app.git
cd plant-care-app

# Configure
cp .env.example .env
nano .env  # Add JWT_SECRET

# Deploy
export GITHUB_USERNAME=YOUR_USERNAME
chmod +x setup-ghcr.sh
./setup-ghcr.sh
```

### Building Locally

```bash
# SSH to CasaOS
ssh user@casaos-ip
cd /DATA/AppData

# Clone repository
git clone https://github.com/YOUR_USERNAME/plant-care-app.git
cd plant-care-app

# Configure
cp .env.example .env
nano .env  # Add JWT_SECRET

# Deploy
chmod +x setup-casaos.sh
./setup-casaos.sh
```

## Common Commands

All commands below use `docker compose` (V2). The scripts detect this automatically.

### View Logs

**GHCR deployment:**
```bash
cd /DATA/AppData/plant-care-app
docker compose -f docker-compose.ghcr.yml logs -f
```

**Local build:**
```bash
cd /DATA/AppData/plant-care-app
docker compose logs -f
```

**Specific service:**
```bash
docker compose logs -f backend
docker compose logs -f frontend
```

### Check Status

**GHCR:**
```bash
docker compose -f docker-compose.ghcr.yml ps
```

**Local:**
```bash
docker compose ps
```

### Restart Services

**GHCR:**
```bash
docker compose -f docker-compose.ghcr.yml restart
```

**Local:**
```bash
docker compose restart
```

**Restart specific service:**
```bash
docker compose restart backend
docker compose restart frontend
```

### Stop Application

**GHCR:**
```bash
docker compose -f docker-compose.ghcr.yml down
```

**Local:**
```bash
docker compose down
```

### Start Application

**GHCR:**
```bash
docker compose -f docker-compose.ghcr.yml up -d
```

**Local:**
```bash
docker compose up -d
```

### Update Application

**GHCR method (pull new images):**
```bash
cd /DATA/AppData/plant-care-app
git pull origin main  # Get latest compose files
docker compose -f docker-compose.ghcr.yml pull
docker compose -f docker-compose.ghcr.yml up -d
```

**Local method (rebuild):**
```bash
cd /DATA/AppData/plant-care-app
git pull origin main
docker compose up -d --build
```

### Backup Data

```bash
# Create backup directory
mkdir -p ~/backups/plant-care

# Backup database
docker cp plant-care-backend:/app/data/plants.db ~/backups/plant-care/

# Backup photos
docker cp plant-care-backend:/app/data/uploads ~/backups/plant-care/uploads/
```

### Restore Data

```bash
# Stop containers first
docker compose -f docker-compose.ghcr.yml down

# Restore database
docker cp ~/backups/plant-care/plants.db plant-care-backend:/app/data/

# Restore photos
docker cp ~/backups/plant-care/uploads/ plant-care-backend:/app/data/

# Start containers
docker compose -f docker-compose.ghcr.yml up -d
```

## Troubleshooting

### Check Docker Compose Version

```bash
# Should show V2.x.x
docker compose version
```

If this fails, Docker Compose V2 might not be installed. CasaOS should have it by default.

### If "docker compose" doesn't work

Try with the hyphen:
```bash
docker-compose version
```

The setup scripts will automatically detect which one is available.

### View Container Details

```bash
# Inspect backend
docker inspect plant-care-backend

# Check health
docker inspect plant-care-backend | grep -A 10 Health

# Check environment variables
docker inspect plant-care-backend | grep -A 20 Env
```

### Access Container Shell

```bash
# Backend
docker exec -it plant-care-backend sh

# Frontend (nginx)
docker exec -it plant-care-frontend sh

# Inside container, check files
ls -la /app/data
cat /app/data/plants.db
```

### Check Network

```bash
# List networks
docker network ls

# Inspect plant care network
docker network inspect plant-care-app_plant-care-network
```

### View Volumes

```bash
# List volumes
docker volume ls | grep plant

# Inspect volume
docker volume inspect plant-care-app_plant_data

# See volume location on host
docker volume inspect plant-care-app_plant_data | grep Mountpoint
```

### Clean Up (Danger Zone!)

**Remove everything (loses all data):**
```bash
cd /DATA/AppData/plant-care-app
docker compose -f docker-compose.ghcr.yml down -v
```

**Remove unused Docker data:**
```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune

# Remove everything unused
docker system prune -a
```

## Environment Variables

Edit `.env` file:
```bash
cd /DATA/AppData/plant-care-app
nano .env
```

Required:
```env
JWT_SECRET=your-long-random-secret-here
```

Optional:
```env
PERENUAL_API_KEY=your_key
TREFLE_API_KEY=your_key
CLAUDE_API_KEY=your_key
```

After changing `.env`, restart:
```bash
docker compose -f docker-compose.ghcr.yml restart
```

## Port Management

Default ports:
- **3000** - Frontend (web interface)
- **3001** - Backend (API)

### Change Ports

Edit `docker-compose.ghcr.yml`:
```yaml
services:
  backend:
    ports:
      - "3002:3001"  # External:Internal
  frontend:
    ports:
      - "8080:80"    # External:Internal
```

Then restart:
```bash
docker compose -f docker-compose.ghcr.yml up -d --force-recreate
```

### Check Port Usage

```bash
# See what's listening
netstat -tlnp | grep 3000
netstat -tlnp | grep 3001

# Check if port is available
nc -zv localhost 3000
```

## Resource Monitoring

```bash
# Real-time resource usage
docker stats plant-care-backend plant-care-frontend

# CPU and memory limits (add to docker-compose.ghcr.yml)
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
        reservations:
          memory: 256M
```

## Useful One-Liners

**Quick health check:**
```bash
curl http://localhost:3001/api/health
```

**Tail logs from both services:**
```bash
docker compose -f docker-compose.ghcr.yml logs -f --tail=50
```

**Restart everything fresh:**
```bash
docker compose -f docker-compose.ghcr.yml down && docker compose -f docker-compose.ghcr.yml up -d
```

**Check database size:**
```bash
docker exec plant-care-backend ls -lh /app/data/plants.db
```

**Count uploaded photos:**
```bash
docker exec plant-care-backend find /app/data/uploads -type f | wc -l
```

**See all environment variables:**
```bash
docker exec plant-care-backend env | grep -E 'JWT|API_KEY'
```

## Aliases (Optional)

Add to `~/.bashrc` for shortcuts:

```bash
# Plant Care App aliases
alias pc-logs='docker compose -f /DATA/AppData/plant-care-app/docker-compose.ghcr.yml logs -f'
alias pc-status='docker compose -f /DATA/AppData/plant-care-app/docker-compose.ghcr.yml ps'
alias pc-restart='docker compose -f /DATA/AppData/plant-care-app/docker-compose.ghcr.yml restart'
alias pc-update='cd /DATA/AppData/plant-care-app && docker compose -f docker-compose.ghcr.yml pull && docker compose -f docker-compose.ghcr.yml up -d'
alias pc-backup='docker cp plant-care-backend:/app/data/plants.db ~/backups/plant-care-$(date +%Y%m%d).db'
```

Then reload:
```bash
source ~/.bashrc
```

Usage:
```bash
pc-logs      # View logs
pc-status    # Check status
pc-restart   # Restart app
pc-update    # Update app
pc-backup    # Backup database
```

## Getting Help

- Full documentation: [README.md](README.md)
- GHCR guide: [GITHUB_CONTAINER_REGISTRY.md](GITHUB_CONTAINER_REGISTRY.md)
- Troubleshooting: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- Quick start: [QUICK_START.md](QUICK_START.md)

## Important Notes

1. **Always use the space:** `docker compose` not `docker-compose` on CasaOS
2. **Scripts auto-detect:** The setup scripts will use the correct version automatically
3. **Data persistence:** All data is in Docker volumes, survives container restarts
4. **Backups:** Regular backups recommended before updates
5. **Updates:** GHCR method is faster, local build takes 5-10 minutes
