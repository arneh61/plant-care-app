# Quick Start Guide - Plant Care App

Choose your deployment method and follow the steps below.

## 🚀 Method 1: GitHub Container Registry (Recommended)

**Best for:** Fast deployment, automatic updates

### Step 1: Push to GitHub

```bash
# On your computer
cd plant-care-app
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/plant-care-app.git
git push -u origin main
```

### Step 2: Enable Package Visibility

1. Wait 5-10 min for GitHub Actions to build
2. Go to: https://github.com/YOUR_USERNAME?tab=packages
3. Click each package → Package settings → Change visibility → Public

### Step 3: Deploy on CasaOS

```bash
# SSH to CasaOS
ssh user@casaos-ip
cd /DATA/AppData

# Clone and setup
git clone https://github.com/YOUR_USERNAME/plant-care-app.git
cd plant-care-app
cp .env.example .env
nano .env  # Add JWT_SECRET

# Deploy
export GITHUB_USERNAME=YOUR_USERNAME
./setup-ghcr.sh
```

### Step 4: Access

Open: `http://casaos-ip:3000`

---

## 🔨 Method 2: Build Locally

**Best for:** Simple setup, no GitHub Actions

### Step 1: Deploy on CasaOS

```bash
# SSH to CasaOS
ssh user@casaos-ip
cd /DATA/AppData

# Clone (or transfer files)
git clone https://github.com/YOUR_USERNAME/plant-care-app.git
cd plant-care-app
```

### Step 2: Configure

```bash
cp .env.example .env
nano .env  # Add JWT_SECRET
```

### Step 3: Build and Start

```bash
./setup-casaos.sh
```

This will build Docker images (takes 5-10 min first time) and start the app.

### Step 4: Access

Open: `http://casaos-ip:3000`

---

## Environment Configuration

Minimum `.env` file:

```env
JWT_SECRET=<run: openssl rand -base64 32>
```

Optional (for better plant search):

```env
PERENUAL_API_KEY=get-from-perenual.com
TREFLE_API_KEY=get-from-trefle.io
CLAUDE_API_KEY=get-from-anthropic.com
```

---

## Common Commands

### View Logs
```bash
# GHCR method:
docker-compose -f docker-compose.ghcr.yml logs -f

# Build method:
docker-compose logs -f
```

### Restart
```bash
# GHCR:
docker-compose -f docker-compose.ghcr.yml restart

# Build:
docker-compose restart
```

### Update

**GHCR method:**
```bash
cd /DATA/AppData/plant-care-app
docker-compose -f docker-compose.ghcr.yml pull
docker-compose -f docker-compose.ghcr.yml up -d
```

**Build method:**
```bash
cd /DATA/AppData/plant-care-app
git pull origin main
docker-compose up -d --build
```

### Stop
```bash
# GHCR:
docker-compose -f docker-compose.ghcr.yml down

# Build:
docker-compose down
```

---

## Comparison

| Feature | GHCR Method | Build Method |
|---------|-------------|--------------|
| **Deploy Speed** | Fast (pull only) | Slow (5-10 min build) |
| **Updates** | Automatic from GitHub | Manual rebuild |
| **Setup Complexity** | Medium (GitHub Actions) | Simple (one script) |
| **Server Load** | Minimal | High during build |
| **Requirements** | GitHub public repo | Just Docker |
| **Best For** | Production | Testing/Development |

---

## Troubleshooting

### Can't pull GHCR images
- Check images are public on GitHub
- Verify GitHub username is correct
- Wait for GitHub Actions to complete

### Build fails
- Check Docker is running
- Check available disk space: `df -h`
- Check logs: `docker-compose logs`

### Can't access app
- Check containers: `docker-compose ps`
- Check ports: `netstat -tlnp | grep 3000`
- Check firewall: `ufw status`

---

## Next Steps

1. Create first account
2. Add API keys for plant search
3. Create a collection
4. Add your first plant
5. Upload a photo

---

## Full Documentation

- **GitHub Container Registry**: [GITHUB_CONTAINER_REGISTRY.md](GITHUB_CONTAINER_REGISTRY.md)
- **CasaOS Setup**: [CASAOS_SETUP.md](CASAOS_SETUP.md)
- **Complete Guide**: [README.md](README.md)
- **Deployment Checklist**: [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
