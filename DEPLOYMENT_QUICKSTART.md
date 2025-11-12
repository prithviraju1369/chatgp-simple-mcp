# 🚀 Quick Deployment Guide

Get your Marriott Hotel Search app deployed in 5 minutes!

## 🎯 Recommended: Render (Easiest)

### Step 1: Prepare Repository
```bash
# Make sure both projects are in your Git repo
git add .
git commit -m "Ready for deployment"
git push
```

### Step 2: Deploy on Render
1. Go to [render.com](https://render.com) and sign up
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select the `chatgp-simple-mcp` directory
5. Configure:
   - **Name**: `marriott-hotel-search`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start:hotels`
   - **Instance Type**: Free
6. Click "Create Web Service"
7. Wait for deployment (2-5 minutes)

### Step 3: Get Your URL
After deployment, Render provides an HTTPS URL like:
```
https://marriott-hotel-search.onrender.com
```

### Step 4: Add to ChatGPT
1. Open ChatGPT
2. Go to Apps → Create App
3. Use manifest URL:
```
https://YOUR-RENDER-URL/.well-known/apps.json
```

### Step 5: Test
```bash
# Test health endpoint
curl https://YOUR-RENDER-URL/

# Test manifest
curl https://YOUR-RENDER-URL/.well-known/apps.json
```

## 🔧 Important Notes

### Build Process
The build script (`npm run build`) will:
1. Build the MCP server from `../mcp-local-main`
2. Build the main application
3. Copy MCP server to `dist/mcp-server/index.js`

### Repository Structure
Make sure your repository has this structure:
```
your-repo/
  ├── chatgp-simple-mcp/
  │   ├── src/
  │   ├── package.json
  │   └── ...
  └── mcp-local-main/
      ├── src/
      ├── package.json
      └── ...
```

### Environment Variables
Render automatically sets:
- `PORT` - Server port
- `NODE_ENV=production` - Production mode

No additional environment variables needed!

## 🐛 Troubleshooting

### Build Fails: "mcp-local-main not found"
**Solution**: Make sure `mcp-local-main` is in your Git repository at the same level as `chatgp-simple-mcp`.

### Subprocess Fails
**Solution**: Check that `dist/mcp-server/index.js` exists after build. The build script should create this automatically.

### Port Issues
**Solution**: Render sets `PORT` automatically. Don't hardcode port 3000.

## 📊 Alternative Platforms

### Railway
1. Go to [railway.app](https://railway.app)
2. Create new project from GitHub
3. Select `chatgp-simple-mcp` directory
4. Railway auto-detects `railway.json` config
5. Deploy!

### Fly.io
1. Install Fly CLI: `curl -L https://fly.io/install.sh | sh`
2. Run: `fly launch` in `chatgp-simple-mcp` directory
3. Follow prompts
4. Deploy: `fly deploy`

## ✅ Success Checklist

- [ ] Repository has both `chatgp-simple-mcp` and `mcp-local-main`
- [ ] Build completes successfully
- [ ] Health endpoint returns `200 OK`
- [ ] Manifest endpoint returns JSON
- [ ] HTTPS URL works in ChatGPT

## 🎉 You're Done!

Your app is now deployed and ready to use in ChatGPT!

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md)

