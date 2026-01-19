# Deployment Checklist for CasaOS

Use this checklist to deploy your Plant Care App to CasaOS.

## ✅ Pre-Deployment Checklist

### Local Setup (Do this on your computer first)

- [ ] Project has all necessary files
- [ ] `.env.example` exists with all variables
- [ ] `.gitignore` excludes `.env` and sensitive files
- [ ] `docker-compose.yml` is configured
- [ ] Dockerfiles exist for backend and frontend
- [ ] README.md is complete
- [ ] Code is tested locally (optional but recommended)

### GitHub Setup

- [ ] Create GitHub repository
- [ ] Initialize git in project folder
- [ ] Add all files: `git add .`
- [ ] Create initial commit: `git commit -m "Initial commit"`
- [ ] Add remote: `git remote add origin https://github.com/YOUR_USERNAME/plant-care-app.git`
- [ ] Push to GitHub: `git push -u origin main`
- [ ] Verify files on GitHub (check .env is NOT there!)

## 🚀 Deployment Steps

### On Your CasaOS Server

**Step 1: Connect**
- [ ] SSH into CasaOS: `ssh user@casaos-ip`
- [ ] Navigate to apps: `cd /DATA/AppData`

**Step 2: Clone**
- [ ] Clone repository: `git clone https://github.com/YOUR_USERNAME/plant-care-app.git`
- [ ] Enter directory: `cd plant-care-app`

**Step 3: Configure**
- [ ] Create .env: `cp .env.example .env`
- [ ] Edit .env: `nano .env`
- [ ] Set JWT_SECRET (use `openssl rand -base64 32`)
- [ ] Add API keys (optional):
  - [ ] PERENUAL_API_KEY
  - [ ] TREFLE_API_KEY
  - [ ] CLAUDE_API_KEY
- [ ] Save .env file

**Step 4: Deploy**
- [ ] Make setup script executable: `chmod +x setup-casaos.sh`
- [ ] Run setup: `./setup-casaos.sh`
- [ ] Wait for build to complete (may take 5-10 minutes first time)

**Step 5: Verify**
- [ ] Check containers: `docker-compose ps`
- [ ] Both containers should show "Up" and "healthy"
- [ ] Check logs: `docker-compose logs -f` (Ctrl+C to exit)

## 🧪 Testing

- [ ] Open browser to `http://casaos-ip:3000`
- [ ] Frontend loads successfully
- [ ] Create a test account
- [ ] Login works
- [ ] Create a collection
- [ ] Search for a plant (try "Monstera")
- [ ] Add a plant to collection
- [ ] Upload a photo
- [ ] Set photo as thumbnail
- [ ] Log a watering
- [ ] Invite feature works

## 📊 Post-Deployment

**Add to CasaOS Dashboard**
- [ ] Open CasaOS web interface
- [ ] Add custom app or bookmark
- [ ] Name: Plant Care
- [ ] URL: `http://casaos-ip:3000`
- [ ] Icon: 🪴

**Setup Backups**
- [ ] Create backup directory: `mkdir -p ~/backups/plant-care`
- [ ] Test backup: `docker cp plant-care-backend:/app/data/plants.db ~/backups/plant-care/`
- [ ] Schedule regular backups (cron or CasaOS task)

**Security**
- [ ] Verify .env is not in git: `git status`
- [ ] JWT_SECRET is strong and unique
- [ ] Firewall allows ports 3000/3001 (if needed)
- [ ] Consider setting up reverse proxy with HTTPS
- [ ] Consider VPN access (Tailscale/Wireguard) if accessing remotely

## 📝 Maintenance Commands

### View Status
```bash
cd /DATA/AppData/plant-care-app
docker-compose ps
```

### View Logs
```bash
docker-compose logs -f
docker-compose logs -f backend  # backend only
```

### Restart
```bash
docker-compose restart
```

### Stop
```bash
docker-compose down
```

### Start
```bash
docker-compose up -d
```

### Update
```bash
git pull origin main
docker-compose down
docker-compose up -d --build
```

### Backup
```bash
docker cp plant-care-backend:/app/data/plants.db ~/backups/plant-care/
docker cp plant-care-backend:/app/data/uploads ~/backups/plant-care/uploads
```

## ⚠️ Troubleshooting

If something goes wrong:

1. **Check logs**: `docker-compose logs backend`
2. **Check container status**: `docker-compose ps`
3. **Restart containers**: `docker-compose restart`
4. **Rebuild**: `docker-compose down && docker-compose up -d --build`
5. **Check .env file**: `cat .env`
6. **Check ports**: `netstat -tlnp | grep 3000`

## 🔄 Update Process

When you make changes:

**On Local Machine:**
1. Make changes
2. Test locally
3. Commit: `git add . && git commit -m "Description"`
4. Push: `git push origin main`

**On CasaOS:**
1. Pull changes: `git pull origin main`
2. Rebuild: `docker-compose up -d --build`
3. Test changes

## 📚 Documentation

- Main guide: `README.md`
- CasaOS specific: `CASAOS_SETUP.md`
- API configuration: `backend/README_PLANT_APIs.md`
- This checklist: `DEPLOYMENT_CHECKLIST.md`

## ✨ Success Indicators

Your deployment is successful when:
- ✅ Both containers show "healthy" status
- ✅ Frontend accessible at port 3000
- ✅ Can create account and login
- ✅ Plant search returns results
- ✅ Can add plants and upload photos
- ✅ No errors in logs
- ✅ Data persists after container restart

## 🎉 You're Done!

Once all checkboxes are complete, your Plant Care App is successfully deployed on CasaOS!

Share the URL with your household members and start tracking your plants together.

---

**Need Help?**
- Review documentation in the repository
- Check troubleshooting section
- Create an issue on GitHub
