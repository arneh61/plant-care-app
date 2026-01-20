# Volume Naming for CasaOS Compatibility

## Important Change

All Docker volume names now use **hyphens** instead of underscores for better CasaOS compatibility.

### Before (with underscores):
```yaml
volumes:
  plant_data:      # ❌ Can cause issues in CasaOS
  plant_uploads:   # ❌ Can cause issues in CasaOS
```

### After (with hyphens):
```yaml
volumes:
  plant-data:      # ✅ CasaOS compatible
  plant-uploads:   # ✅ CasaOS compatible
```

## Why This Matters

CasaOS can struggle with underscores in Docker volume names, potentially causing:
- Volume mounting failures
- Permission issues
- Data persistence problems

Using hyphens avoids these issues entirely.

## Files Updated

All compose files have been updated:
- ✅ `docker-compose.yml`
- ✅ `docker-compose.ghcr.yml`
- ✅ `casaos-app.yml`

## For Existing Deployments

If you already deployed with underscores and have data, you need to migrate:

### Option 1: Backup and Redeploy (Recommended)

```bash
# 1. Backup existing data
docker cp plant-care-backend:/app/data/plants.db ~/backup/
docker cp plant-care-backend:/app/data/uploads ~/backup/uploads

# 2. Stop and remove old deployment
docker compose down -v

# 3. Update compose files (already done)
git pull origin main

# 4. Start with new volume names
docker compose up -d

# 5. Restore data
docker cp ~/backup/plants.db plant-care-backend:/app/data/
docker cp ~/backup/uploads/ plant-care-backend:/app/data/

# 6. Restart to apply
docker compose restart backend
```

### Option 2: Rename Volumes (Advanced)

```bash
# Stop containers
docker compose down

# Create new volumes
docker volume create plant-data
docker volume create plant-uploads

# Copy data between volumes
docker run --rm \
  -v plant_data:/source \
  -v plant-data:/target \
  alpine sh -c "cp -av /source/. /target/"

docker run --rm \
  -v plant_uploads:/source \
  -v plant-uploads:/target \
  alpine sh -c "cp -av /source/. /target/"

# Update compose file and start
docker compose up -d

# Verify and remove old volumes
docker volume ls
docker volume rm plant_data plant_uploads
```

## For Fresh Deployments

Nothing to worry about! Just deploy as normal:

```bash
./setup-ghcr.sh
# or
./setup-casaos.sh
```

The new volume names will be used automatically.

## Volume Names Reference

| Old Name (underscore) | New Name (hyphen) | Purpose |
|----------------------|-------------------|---------|
| `plant_data` | `plant-data` | SQLite database |
| `plant_uploads` | `plant-uploads` | Plant photos |

## Checking Your Volumes

```bash
# List all volumes
docker volume ls

# You should see:
# plant-data
# plant-uploads

# NOT:
# plant_data
# plant_uploads
```

## Network Naming

Network name remains the same (uses hyphens):
- `plant-care-network` ✅

## Summary

- **Old format**: `plant_data` (underscore)
- **New format**: `plant-data` (hyphen)
- **Reason**: Better CasaOS compatibility
- **Action required**: Only if you have existing data (see migration above)
- **Fresh installs**: Works automatically

This change ensures smooth operation on CasaOS systems.
