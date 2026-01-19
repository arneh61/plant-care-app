# Plant Care App 🪴

A comprehensive plant care management application with multiple plant databases, photo tracking, watering schedules, and collaborative features.

## Features

- 🔍 **Smart Plant Search** - Multiple database sources (Perenual, Trefle, Wikipedia)
- 📸 **Photo Gallery** - Track plant growth with photos and set custom thumbnails
- 💧 **Watering Tracker** - Smart watering reminders based on plant needs
- 🌿 **Fertilizer Log** - Track feeding schedules
- 👥 **Collaboration** - Share collections with family or roommates
- 🩺 **Plant Doctor** - AI-powered plant care assistant (requires Claude API)
- 📱 **Responsive Design** - Works on desktop and mobile

## Quick Start with CasaOS

### Two Deployment Options

**🚀 Option 1: Pre-built Images (Recommended - Faster)**
- Pull ready-to-use Docker images from GitHub Container Registry
- No build time on your server (instant deployment!)
- Automatic builds on every code push
- See [GITHUB_CONTAINER_REGISTRY.md](GITHUB_CONTAINER_REGISTRY.md)

**🔨 Option 2: Build Locally**
- Build Docker images on your CasaOS server
- Takes 5-10 minutes on first deployment
- No GitHub Actions setup needed
- See instructions below

### Prerequisites
- CasaOS installed on your server
- Docker and Docker Compose installed
- GitHub account (for cloning/pushing the repository)

### Option 1: Deploy with Pre-built Images (Fast!)

**See detailed guide:** [GITHUB_CONTAINER_REGISTRY.md](GITHUB_CONTAINER_REGISTRY.md)

**Quick steps:**

1. Push code to GitHub (enables automatic Docker builds)
2. Wait for GitHub Actions to build images (~5 min first time)
3. On CasaOS:
```bash
cd /DATA/AppData
git clone https://github.com/YOUR_USERNAME/plant-care-app.git
cd plant-care-app
cp .env.example .env
nano .env  # Add JWT_SECRET and optional API keys
export GITHUB_USERNAME=YOUR_USERNAME
./setup-ghcr.sh
```

Access at: `http://your-casaos-ip:3000`

### Option 2: Build Locally (Traditional Method)

### Deployment Steps

#### 1. Clone Repository on Your CasaOS Server

SSH into your CasaOS server and clone the repository:

```bash
# SSH into your CasaOS server
ssh user@your-casaos-ip

# Navigate to your apps directory
cd /DATA/AppData

# Clone the repository
git clone https://github.com/YOUR_USERNAME/plant-care-app.git

# Navigate to the project
cd plant-care-app
```

#### 2. Configure Environment Variables

Create a `.env` file from the example:

```bash
cp .env.example .env
nano .env  # or use vi, vim, etc.
```

**Required Configuration:**
```env
# IMPORTANT: Change this to a strong random string!
JWT_SECRET=your-very-long-random-secret-string-here

# Optional API keys for enhanced plant search
PERENUAL_API_KEY=your_perenual_key  # Get from https://perenual.com/docs/api
TREFLE_API_KEY=your_trefle_key      # Get from https://trefle.io/
CLAUDE_API_KEY=your_claude_key      # Get from https://console.anthropic.com/
```

**How to get API keys:**
1. **Perenual** (Recommended): Sign up at https://perenual.com/docs/api - Free tier: 300 requests/day
2. **Trefle**: Create account at https://trefle.io/ - Free tier: 120 requests/day
3. **Claude** (Optional): For AI plant doctor feature at https://console.anthropic.com/

#### 3. Deploy with Docker Compose

```bash
# Build and start the containers
docker-compose up -d

# Check if containers are running
docker-compose ps

# View logs if needed
docker-compose logs -f
```

#### 4. Access Your App

- Frontend: `http://your-casaos-ip:3000`
- Backend API: `http://your-casaos-ip:3001`

#### 5. Add to CasaOS Dashboard (Optional)

To add the app to your CasaOS dashboard:

1. Open CasaOS web interface
2. Go to App Store
3. Click "Add Source" or "Custom Install"
4. Point to the running containers on ports 3000 and 3001

### Docker Compose Configuration

The `docker-compose.yml` includes:

- **Backend** (Node.js + Express + SQLite)
  - Port: 3001
  - Persistent volumes for database and uploads
  - Health checks
  - Auto-restart

- **Frontend** (React + Nginx)
  - Port: 3000
  - Reverse proxy to backend
  - Auto-restart

## GitHub Setup

### 1. Create a New GitHub Repository

```bash
# On GitHub.com, create a new repository (e.g., "plant-care-app")
# Don't initialize with README, .gitignore, or license
```

### 2. Push Your Code

```bash
# From your local project directory
cd plant-care-app

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Plant Care App with Docker support"

# Add remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/plant-care-app.git

# Push to GitHub
git branch -M main
git push -u origin main
```

### 3. Important Security Note

⚠️ **Never commit your `.env` file!** The `.gitignore` file excludes it, but double-check:

```bash
# Verify .env is not tracked
git status

# If .env appears, remove it from git
git rm --cached .env
git commit -m "Remove .env from tracking"
git push
```

## Manual Setup (Without Docker)

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your API keys
npm start
```

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

## Project Structure

```
plant-care-app/
├── backend/
│   ├── server.js           # Express API server
│   ├── package.json
│   ├── Dockerfile
│   └── README_PLANT_APIs.md  # Detailed API documentation
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── App.js
│   │   └── App.css
│   ├── package.json
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml      # Docker Compose configuration
├── .env.example           # Environment variables template
├── .gitignore
└── README.md
```

## Data Persistence

All data is persisted in Docker volumes:

- `plant_data` - SQLite database
- `plant_uploads` - Plant photos

To backup your data:

```bash
# Backup database
docker cp plant-care-backend:/app/data/plants.db ./backup/

# Backup photos
docker cp plant-care-backend:/app/data/uploads ./backup/
```

## Updating the App

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart containers
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

## Troubleshooting

### Containers won't start

```bash
# Check logs
docker-compose logs backend
docker-compose logs frontend

# Verify environment variables
docker-compose config

# Rebuild from scratch
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### Can't access the app

1. Check firewall rules (ports 3000 and 3001)
2. Verify containers are running: `docker-compose ps`
3. Check CasaOS network settings

### Database errors

```bash
# Stop containers
docker-compose down

# Remove volume (WARNING: deletes all data!)
docker volume rm plant-care-app_plant_data

# Restart
docker-compose up -d
```

## Default Credentials

On first launch, you'll need to create an account. The app uses:
- JWT-based authentication
- Bcrypt password hashing
- Secure session management

## API Endpoints

### Authentication
- `POST /api/register` - Create account
- `POST /api/login` - Login
- `GET /api/user` - Get user info

### Collections
- `GET /api/collections` - List collections
- `POST /api/collections` - Create collection
- `GET /api/collections/:id/plants` - Get plants

### Plants
- `GET /api/plants/search` - Search plants (multi-source)
- `POST /api/collections/:id/plants` - Add plant
- `POST /api/collections/:id/plants/manual` - Add manually
- `GET /api/plants/:id` - Get plant details
- `POST /api/plants/:id/water` - Log watering
- `POST /api/plants/:id/photos` - Upload photo
- `PUT /api/plants/:id/thumbnail` - Set thumbnail

## Tech Stack

### Backend
- Node.js + Express
- SQLite (better-sqlite3)
- JWT authentication
- Multer (file uploads)
- Axios (API requests)
- Cheerio (web scraping)

### Frontend
- React 18
- React Router
- Axios
- date-fns
- CSS3

### Infrastructure
- Docker + Docker Compose
- Nginx (reverse proxy)
- Alpine Linux (minimal images)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with Docker Compose
5. Submit a pull request

## License

MIT License - feel free to use for personal or commercial projects

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review backend/README_PLANT_APIs.md for API configuration
3. Create an issue on GitHub

## Credits

Plant data sources:
- Perenual API (https://perenual.com/)
- Trefle API (https://trefle.io/)
- Wikipedia (https://www.wikipedia.org/)
