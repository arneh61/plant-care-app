# Troubleshooting Guide

Common issues and solutions for Plant Care App deployment.

## GitHub Actions Build Failures

### Error: "npm ci failed" or "exit code: 1"

**Error message:**
```
ERROR: failed to solve: process "/bin/sh -c npm ci --only=production" did not complete successfully: exit code: 1
```

**Cause:** Missing or corrupted `package-lock.json` file

**Solution 1: Generate package-lock.json locally**

```bash
# In backend directory
cd backend
npm install
git add package-lock.json
git commit -m "Add package-lock.json"
git push origin main

# In frontend directory
cd frontend
npm install
git add package-lock.json
git commit -m "Add package-lock.json"
git push origin main
```

**Solution 2: Already fixed in Dockerfile**

The backend Dockerfile has been updated to use `npm install --production` instead of `npm ci`, which doesn't require package-lock.json.

Just push your latest code:
```bash
git add .
git commit -m "Fix Docker build"
git push origin main
```

### Error: "permission denied" or "authentication required"

**Cause:** Trying to push images to GHCR without proper permissions

**Solution:**

The GitHub Actions workflow uses `GITHUB_TOKEN` which is automatically provided. No additional setup needed. If you see this error:

1. Check workflow file has correct permissions:
```yaml
permissions:
  contents: read
  packages: write
```

2. Verify the workflow file is in `.github/workflows/` directory

3. Check Actions are enabled in repository settings

### Error: "failed to build for platform"

**Error message:**
```
ERROR: failed to build: failed to solve: platform linux/arm64 not supported
```

**Cause:** Buildx not properly configured

**Solution:**

This shouldn't happen with the provided workflow, but if it does:

1. Check GitHub Actions runner has buildx enabled
2. Try removing `platforms` line from workflow temporarily:
```yaml
# Remove or comment out:
# platforms: linux/amd64,linux/arm64
```

3. Build for single platform first, then add multi-platform later

## CasaOS Deployment Issues

### Can't pull images from GHCR

**Error:** "manifest unknown" or "not found"

**Cause:** Images not public or don't exist yet

**Solution:**

1. Check GitHub Actions completed successfully (Actions tab)
2. Verify packages exist: `https://github.com/YOUR_USERNAME?tab=packages`
3. Make packages public:
   - Click package → Package settings
   - Change visibility → Public
   - Confirm

**Verify images exist:**
```bash
# Test pulling without running
docker pull ghcr.io/YOUR_USERNAME/plant-care-app-backend:latest
docker pull ghcr.io/YOUR_USERNAME/plant-care-app-frontend:latest
```

### Error: "no such host" or "connection refused"

**Cause:** Wrong GitHub username or image doesn't exist

**Solution:**

1. Verify your GitHub username:
```bash
echo $GITHUB_USERNAME
```

2. Check image names match exactly:
```bash
# Should match this format:
ghcr.io/YOUR_USERNAME/plant-care-app-backend:latest
ghcr.io/YOUR_USERNAME/plant-care-app-frontend:latest
```

3. Check docker-compose.ghcr.yml has correct image names

### Containers start but app doesn't work

**Check 1: Environment variables**
```bash
cd /DATA/AppData/plant-care-app
cat .env
# Verify JWT_SECRET is set
```

**Check 2: Container logs**
```bash
docker-compose -f docker-compose.ghcr.yml logs backend
docker-compose -f docker-compose.ghcr.yml logs frontend
```

**Check 3: Health check**
```bash
docker-compose -f docker-compose.ghcr.yml ps
# Both should show "healthy"
```

**Check 4: Port conflicts**
```bash
netstat -tlnp | grep 3000
netstat -tlnp | grep 3001
# If ports are in use, edit docker-compose.ghcr.yml
```

### Database errors

**Error:** "unable to open database file" or "disk I/O error"

**Solution:**

1. Check volume permissions:
```bash
docker exec plant-care-backend ls -la /app/data
```

2. Recreate volumes:
```bash
docker-compose -f docker-compose.ghcr.yml down -v
docker-compose -f docker-compose.ghcr.yml up -d
```

**Warning:** `-v` flag deletes all data!

### Images won't update

**Issue:** Running `docker-compose pull` but still using old images

**Solution:**

1. Force pull:
```bash
docker-compose -f docker-compose.ghcr.yml pull --ignore-pull-failures
```

2. Remove old images:
```bash
docker images | grep plant-care
docker rmi IMAGE_ID  # for each old image
```

3. Pull and recreate:
```bash
docker-compose -f docker-compose.ghcr.yml down
docker-compose -f docker-compose.ghcr.yml pull
docker-compose -f docker-compose.ghcr.yml up -d
```

## Local Build Issues

### Build fails: "cannot find module"

**Cause:** Missing dependencies in package.json

**Solution:**

1. Check package.json includes all dependencies:
```bash
cd backend
cat package.json
```

2. Verify all required packages are listed

3. Rebuild:
```bash
docker-compose build --no-cache backend
```

### Build extremely slow

**Cause:** No build cache or ARM architecture

**Solution:**

1. Use buildx cache:
```bash
docker buildx build --cache-from type=local,src=/tmp/.buildx-cache --cache-to type=local,dest=/tmp/.buildx-cache backend
```

2. Or switch to GHCR method (builds on GitHub's servers)

### Out of disk space during build

**Check space:**
```bash
df -h
docker system df
```

**Clean up:**
```bash
# Remove unused images
docker image prune -a

# Remove build cache
docker builder prune

# Remove everything unused
docker system prune -a --volumes
```

**Warning:** This removes ALL unused Docker data!

## Runtime Issues

### App accessible but features don't work

**Issue:** Plant search returns no results

**Solution:**

Check API keys in .env:
```bash
cat .env | grep API_KEY
```

Add at least one API key:
- PERENUAL_API_KEY
- TREFLE_API_KEY

Restart:
```bash
docker-compose -f docker-compose.ghcr.yml restart backend
```

### Can't upload photos

**Check 1: Volume permissions**
```bash
docker exec plant-care-backend ls -la /app/data/uploads
docker exec plant-care-backend touch /app/data/uploads/test.txt
```

**Check 2: File size limits**

Default limit is 5MB. Check nginx/multer configuration.

**Check 3: Storage space**
```bash
df -h
```

### Login doesn't work / "Invalid token"

**Cause:** JWT_SECRET changed or not set

**Solution:**

1. Verify JWT_SECRET in .env
2. If changed, all users need to re-login
3. Restart backend:
```bash
docker-compose -f docker-compose.ghcr.yml restart backend
```

### Slow performance

**Check 1: Resource usage**
```bash
docker stats plant-care-backend plant-care-frontend
```

**Check 2: Database size**
```bash
docker exec plant-care-backend ls -lh /app/data/plants.db
```

**Check 3: Photo storage**
```bash
docker exec plant-care-backend du -sh /app/data/uploads
```

**Solution:** Add resource limits in docker-compose.ghcr.yml:
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
```

## Network Issues

### Can't access from other devices

**Check 1: Firewall**
```bash
ufw status
ufw allow 3000/tcp
ufw allow 3001/tcp
```

**Check 2: Binding**

Verify containers are listening on 0.0.0.0 not 127.0.0.1:
```bash
docker port plant-care-frontend
docker port plant-care-backend
```

**Check 3: Network mode**

In docker-compose, ensure no `network_mode: host` conflicts.

### Reverse proxy issues

**Issue:** App works locally but not through reverse proxy

**Solution:**

Update nginx.conf to handle proxy headers:
```nginx
location /api {
    proxy_pass http://backend:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

## Getting More Help

### Enable Debug Logging

**Backend:**
```bash
docker-compose -f docker-compose.ghcr.yml logs -f backend
```

**Frontend:**
```bash
docker-compose -f docker-compose.ghcr.yml logs -f frontend
```

**All containers:**
```bash
docker-compose -f docker-compose.ghcr.yml logs -f
```

### Check Container Health

```bash
# Health status
docker-compose -f docker-compose.ghcr.yml ps

# Inspect health
docker inspect plant-care-backend | grep -A 10 Health

# Manual health check
curl http://localhost:3001/api/health
```

### Export Logs for Debugging

```bash
docker-compose -f docker-compose.ghcr.yml logs > debug-logs.txt
```

### Create GitHub Issue

If you can't resolve the issue:

1. Check existing issues: `https://github.com/YOUR_USERNAME/plant-care-app/issues`
2. Create new issue with:
   - Error message
   - Steps to reproduce
   - Docker/OS versions
   - Relevant logs
   - What you've tried

## Quick Fixes

### Nuclear Option (Start Fresh)

**Complete reset:**
```bash
cd /DATA/AppData/plant-care-app

# Backup data first!
docker cp plant-care-backend:/app/data/plants.db ~/backup/
docker cp plant-care-backend:/app/data/uploads ~/backup/uploads

# Remove everything
docker-compose -f docker-compose.ghcr.yml down -v
docker system prune -a
docker volume prune

# Re-deploy
./setup-ghcr.sh
```

### Force Rebuild

**GHCR method:**
```bash
docker-compose -f docker-compose.ghcr.yml down
docker-compose -f docker-compose.ghcr.yml pull --ignore-pull-failures
docker-compose -f docker-compose.ghcr.yml up -d --force-recreate
```

**Build method:**
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d --force-recreate
```

## Prevention

### Best Practices

1. **Always backup before updates**
2. **Test changes locally first**
3. **Use version tags in production**
4. **Monitor logs regularly**
5. **Keep .env file secure**
6. **Document any custom changes**

### Health Monitoring

Set up a simple health check cron:
```bash
# Add to crontab
*/5 * * * * curl -f http://localhost:3001/api/health || docker-compose -f /DATA/AppData/plant-care-app/docker-compose.ghcr.yml restart
```

---

Still stuck? Check the other documentation files:
- [GITHUB_CONTAINER_REGISTRY.md](GITHUB_CONTAINER_REGISTRY.md)
- [CASAOS_SETUP.md](CASAOS_SETUP.md)
- [README.md](README.md)
