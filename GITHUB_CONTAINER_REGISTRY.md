# GitHub Container Registry (GHCR) Deployment

This guide shows you how to use pre-built Docker images from GitHub Container Registry for fast deployment on CasaOS.

## Why Use GHCR?

✅ **Fast deployment** - No building on your CasaOS server (saves 5-10 minutes)
✅ **Automatic updates** - Images built automatically when you push to GitHub
✅ **Multi-architecture** - Supports both AMD64 and ARM64 (Raspberry Pi)
✅ **Free** - GitHub Container Registry is free for public repositories
✅ **Version control** - Tag specific versions (latest, v1.0.0, etc.)

## Setup Process

### Part 1: Push to GitHub (One Time Setup)

#### 1. Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `plant-care-app`
3. Visibility: **Public** (for free GHCR) or Private (requires paid plan for unlimited pulls)
4. Don't initialize with README
5. Click "Create repository"

#### 2. Push Your Code

```bash
# From your local plant-care-app directory
cd plant-care-app

# Initialize git
git init

# Add all files
git add .

# Create initial commit
git commit -m "Initial commit with GitHub Actions for Docker builds"

# Add remote (replace YOUR_USERNAME)
git remote add origin https://github.com/YOUR_USERNAME/plant-care-app.git

# Push to main branch
git branch -M main
git push -u origin main
```

#### 3. Enable GitHub Actions

GitHub Actions should be enabled by default, but verify:

1. Go to your repository on GitHub
2. Click "Actions" tab
3. If prompted, click "I understand my workflows, go ahead and enable them"
4. You should see "Build and Push Docker Images" workflow

#### 4. Wait for First Build

1. Go to "Actions" tab
2. Click on the running workflow
3. Watch the build progress (takes 5-10 minutes)
4. Both backend and frontend images will be built

#### 5. Make Images Public

After the first build completes:

1. Go to https://github.com/YOUR_USERNAME?tab=packages
2. Click on `plant-care-app-backend`
3. Click "Package settings" (right sidebar)
4. Scroll to "Danger Zone"
5. Click "Change visibility" → Make public
6. Repeat for `plant-care-app-frontend`

### Part 2: Deploy on CasaOS

#### Method 1: Using docker-compose (Recommended)

**Step 1: SSH to CasaOS**

```bash
ssh your-username@your-casaos-ip
cd /DATA/AppData
```

**Step 2: Clone Repository**

```bash
git clone https://github.com/YOUR_USERNAME/plant-care-app.git
cd plant-care-app
```

**Step 3: Create .env File**

```bash
cp .env.example .env
nano .env
```

Add at minimum:
```env
JWT_SECRET=your-long-random-secret-here
```

Generate secure secret:
```bash
openssl rand -base64 32
```

Optional API keys:
```env
PERENUAL_API_KEY=your_key_here
TREFLE_API_KEY=your_key_here
CLAUDE_API_KEY=your_key_here
```

**Step 4: Set Your GitHub Username**

```bash
export GITHUB_USERNAME=YOUR_GITHUB_USERNAME
```

Or edit `docker-compose.ghcr.yml` and replace `${GITHUB_USERNAME}` with your actual username.

**Step 5: Pull and Start**

```bash
# Pull pre-built images from GHCR
docker-compose -f docker-compose.ghcr.yml pull

# Start containers
docker-compose -f docker-compose.ghcr.yml up -d

# Check status
docker-compose -f docker-compose.ghcr.yml ps
```

**Step 6: Access**

Open browser to: `http://your-casaos-ip:3000`

#### Method 2: Using CasaOS Custom Install

**Step 1: Make Images Public** (already done above)

**Step 2: Get Image URLs**

Your images are available at:
- Backend: `ghcr.io/YOUR_USERNAME/plant-care-app-backend:latest`
- Frontend: `ghcr.io/YOUR_USERNAME/plant-care-app-frontend:latest`

**Step 3: Import to CasaOS**

1. Open CasaOS web interface
2. Click "+" or "App Store"
3. Click "Custom Install" or "Docker Compose"
4. Upload or paste the `casaos-app.yml` file
5. Replace `YOUR_GITHUB_USERNAME` with your actual username
6. Configure environment variables:
   - JWT_SECRET (required)
   - API keys (optional)
7. Click "Install"

**Step 4: Access**

The app will appear in your CasaOS dashboard. Click to open on port 3000.

## Updating Your App

### Update Code and Trigger New Build

```bash
# Make changes to your code locally
git add .
git commit -m "Description of changes"
git push origin main
```

GitHub Actions will automatically:
1. Build new Docker images
2. Push to GHCR with `latest` tag
3. Make them available in ~5-10 minutes

### Pull Updates on CasaOS

```bash
cd /DATA/AppData/plant-care-app

# Pull latest images
docker-compose -f docker-compose.ghcr.yml pull

# Restart with new images
docker-compose -f docker-compose.ghcr.yml up -d

# Check logs
docker-compose -f docker-compose.ghcr.yml logs -f
```

## Version Tagging

### Create a Release

```bash
# Tag a specific version
git tag -a v1.0.0 -m "Version 1.0.0"
git push origin v1.0.0
```

GitHub Actions will build and tag:
- `ghcr.io/YOUR_USERNAME/plant-care-app-backend:v1.0.0`
- `ghcr.io/YOUR_USERNAME/plant-care-app-backend:1.0`
- `ghcr.io/YOUR_USERNAME/plant-care-app-backend:1`
- `ghcr.io/YOUR_USERNAME/plant-care-app-backend:latest`

### Use Specific Version

Edit `docker-compose.ghcr.yml`:

```yaml
services:
  backend:
    image: ghcr.io/YOUR_USERNAME/plant-care-app-backend:v1.0.0
  frontend:
    image: ghcr.io/YOUR_USERNAME/plant-care-app-frontend:v1.0.0
```

## Troubleshooting

### Images Not Building

**Check Actions tab:**
1. Go to repository → Actions
2. Click on failed workflow
3. Review error logs
4. Common issues:
   - Docker build errors (check Dockerfiles)
   - Syntax errors in workflow file
   - Missing dependencies

### Can't Pull Images (Authentication)

**For public images:**
No authentication needed. Make sure images are public (see step 5 above).

**For private images:**
```bash
# Login to GHCR
echo YOUR_GITHUB_PAT | docker login ghcr.io -u YOUR_USERNAME --password-stdin

# Pull images
docker-compose -f docker-compose.ghcr.yml pull
```

Create Personal Access Token:
1. GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Generate new token
3. Select scopes: `read:packages`, `write:packages`
4. Copy token

### Images Pull Slowly

**Enable Docker BuildKit cache:**
The workflow already uses GitHub Actions cache. Subsequent builds are faster.

**Check network:**
```bash
# Test download speed
docker pull hello-world
```

### Wrong Architecture

The workflow builds for both `linux/amd64` and `linux/arm64`. Docker automatically pulls the correct architecture.

**Check your architecture:**
```bash
uname -m
# x86_64 = amd64
# aarch64 = arm64
```

## Comparison: Build vs. Pre-built

### Building on CasaOS (Original Method)

```bash
docker-compose up -d --build
```

**Pros:**
- Simple, one command
- No GitHub Actions needed
- Works offline (after first build)

**Cons:**
- Takes 5-10 minutes on CasaOS
- Uses CasaOS CPU/RAM
- Slower on ARM devices
- Rebuild needed for updates

### Using Pre-built Images (GHCR Method)

```bash
docker-compose -f docker-compose.ghcr.yml pull
docker-compose -f docker-compose.ghcr.yml up -d
```

**Pros:**
- Instant deployment (just pull)
- No build load on CasaOS
- Automatic updates via GitHub
- Multi-architecture support
- Version control with tags

**Cons:**
- Requires GitHub Actions setup
- Depends on GitHub availability
- Need to make images public (or authenticate)

## Best Practices

1. **Use Tags for Production**
   - Pin specific versions: `v1.0.0`
   - Not `latest` for stability

2. **Keep Images Public**
   - Free unlimited pulls
   - No authentication needed
   - Easier deployment

3. **Monitor Build Status**
   - Subscribe to GitHub Actions notifications
   - Check Actions tab after pushing

4. **Semantic Versioning**
   - Use `v1.0.0` format
   - Major.Minor.Patch
   - Document breaking changes

5. **Test Before Tagging**
   - Push to main first
   - Test `latest` tag
   - Then create version tag

## GitHub Actions Workflow Explained

Located at `.github/workflows/docker-build.yml`

**Triggers:**
- Push to `main` branch
- Create tag `v*.*.*`
- Manual trigger
- Pull requests (build only, no push)

**What it does:**
1. Checks out code
2. Sets up Docker Buildx (multi-platform builds)
3. Logs into GHCR
4. Builds backend image for AMD64 and ARM64
5. Pushes to GHCR with tags
6. Builds frontend image for AMD64 and ARM64
7. Pushes to GHCR with tags
8. Uses GitHub Actions cache for speed

**Build time:** ~5-10 minutes

## Cost

**GitHub Actions:**
- Public repos: Unlimited free minutes
- Private repos: 2,000 free minutes/month

**GHCR Storage:**
- Public images: Free
- Private images: 500MB free, then $0.25/GB/month

**Bandwidth:**
- Unlimited for public images
- Paid for private images

## Support

**Build issues:**
- Check Actions tab in GitHub
- Review workflow logs
- Verify Dockerfiles syntax

**Deployment issues:**
- Check image names match your username
- Verify images are public
- Check CasaOS logs

**Image updates not pulling:**
- Check GitHub Actions completed
- Try `docker-compose pull` again
- Verify image tag exists on GHCR

## Alternative: Docker Hub

You can also use Docker Hub instead of GHCR:

1. Create account at hub.docker.com
2. Replace `ghcr.io` with `docker.io` in workflow
3. Add Docker Hub credentials to GitHub Secrets
4. Update image names in docker-compose

GHCR is recommended because it's integrated with GitHub and free for public repos.

---

Now you have automatic Docker builds on every git push! 🚀
