# 🚀 Deployment Guide

Deploy the Marriott Hotel Search ChatGPT App to free hosting platforms.

## 📋 Prerequisites

- Node.js 18+ installed locally
- Git repository set up
- Account on chosen deployment platform

## 🎯 Supported Platforms

### 1. **Render** (Recommended - Free Tier Available)
- ✅ Free tier with HTTPS
- ✅ Supports subprocess spawning
- ✅ Auto-deploy from Git
- ✅ Environment variables support

### 2. **Railway** (Recommended - Free Credits)
- ✅ Free tier with $5/month credits
- ✅ Docker support
- ✅ Auto-deploy from Git
- ✅ Environment variables support

### 3. **Fly.io** (Alternative)
- ✅ Free tier available
- ✅ Global edge deployment
- ✅ Docker support

## 📦 Pre-Deployment Setup

### 1. Build the Application

```bash
cd chatgp-simple-mcp

# Install dependencies
npm install

# Build MCP server and main app
npm run build
```

This will:
- Build the MCP server (`mcp-local-main`)
- Build the main application
- Copy MCP server to `dist/mcp-server/index.js`

### 2. Verify Build

```bash
# Check that MCP server is bundled
ls -la dist/mcp-server/index.js

# Should output: dist/mcp-server/index.js exists

# Test locally
npm run start:hotels

# Test health endpoint
curl http://localhost:3000/

# Test manifest
curl http://localhost:3000/.well-known/apps.json
```

## 🚀 Deployment Options

### Option 1: Render (Recommended)

#### Step 1: Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub

#### Step 2: Create New Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Select the `chatgp-simple-mcp` directory

#### Step 3: Configure Service
- **Name**: `marriott-hotel-search`
- **Environment**: `Node`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start:hotels`
- **Instance Type**: Free

#### Step 4: Environment Variables
Add these in Render dashboard:
- `NODE_ENV=production`
- `PORT=3000` (optional, Render sets this automatically)

#### Step 5: Deploy
1. Click "Create Web Service"
2. Wait for build to complete
3. Copy the HTTPS URL (e.g., `https://marriott-hotel-search.onrender.com`)

#### Step 6: Configure ChatGPT
Use the manifest URL in ChatGPT:
```
https://YOUR-RENDER-URL/.well-known/apps.json
```

---

### Option 2: Railway

#### Step 1: Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub

#### Step 2: Create New Project
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Choose your repository
4. Select the `chatgp-simple-mcp` directory

#### Step 3: Configure Service
Railway will auto-detect the `railway.json` configuration:
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start:hotels`

#### Step 4: Environment Variables
Add in Railway dashboard:
- `NODE_ENV=production`
- `PORT=3000` (optional)

#### Step 5: Deploy
1. Railway will automatically deploy
2. Copy the generated URL (e.g., `https://marriott-hotel-search.up.railway.app`)

#### Step 6: Configure ChatGPT
Use the manifest URL:
```
https://YOUR-RAILWAY-URL/.well-known/apps.json
```

---

### Option 3: Fly.io

#### Step 1: Install Fly CLI
```bash
curl -L https://fly.io/install.sh | sh
```

#### Step 2: Login to Fly.io
```bash
fly auth login
```

#### Step 3: Create Fly App
```bash
cd chatgp-simple-mcp
fly launch
```

Follow the prompts:
- App name: `marriott-hotel-search`
- Region: Choose closest to you
- PostgreSQL: No
- Redis: No

#### Step 4: Deploy
```bash
fly deploy
```

#### Step 5: Get URL
```bash
fly info
```

Copy the URL (e.g., `https://marriott-hotel-search.fly.dev`)

#### Step 6: Configure ChatGPT
Use the manifest URL:
```
https://YOUR-FLY-URL/.well-known/apps.json
```

---

## 🔧 Environment Variables

### Required
- `NODE_ENV=production` - Set to production mode

### Optional
- `PORT=3000` - Server port (usually auto-set by platform)
- `MARRIOTT_MCP_SERVER_PATH` - Custom MCP server path (usually not needed)

## 🧪 Testing Deployment

### 1. Health Check
```bash
curl https://YOUR-DEPLOYMENT-URL/
```

Should return:
```json
{"status":"ok","message":"Marriott Hotel Search MCP Server"}
```

### 2. Manifest Check
```bash
curl https://YOUR-DEPLOYMENT-URL/.well-known/apps.json
```

Should return the ChatGPT app manifest.

### 3. MCP Endpoint Check
```bash
curl -X POST https://YOUR-DEPLOYMENT-URL/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}'
```

## 🐛 Troubleshooting

### Build Fails

**Issue**: MCP server not found during build
**Solution**: 
```bash
# Build MCP server first
cd ../mcp-local-main
npm install
npm run build
cd ../chatgp-simple-mcp
npm run build
```

### Subprocess Fails

**Issue**: MCP server subprocess fails in deployment
**Solution**: 
1. Check that `dist/mcp-server/index.js` exists in deployment
2. Verify `MARRIOTT_MCP_SERVER_PATH` environment variable if set
3. Check deployment logs for path errors

### Port Issues

**Issue**: Server won't start
**Solution**: 
- Render/Railway/Fly.io set `PORT` automatically
- Don't hardcode port 3000 in production
- Use `process.env.PORT || 3000`

### HTTPS Required

**Issue**: ChatGPT requires HTTPS
**Solution**: 
- All platforms (Render, Railway, Fly.io) provide HTTPS by default
- Use the provided HTTPS URL in ChatGPT

## 📊 Platform Comparison

| Platform | Free Tier | HTTPS | Subprocess | Auto-Deploy | Ease of Use |
|----------|-----------|-------|------------|-------------|-------------|
| Render   | ✅ Yes    | ✅    | ✅         | ✅          | ⭐⭐⭐⭐⭐   |
| Railway  | ✅ $5/mo  | ✅    | ✅         | ✅          | ⭐⭐⭐⭐⭐   |
| Fly.io   | ✅ Yes    | ✅    | ✅         | ✅          | ⭐⭐⭐⭐     |

## 🔗 Next Steps

1. **Deploy to chosen platform**
2. **Test all endpoints**
3. **Add to ChatGPT** using manifest URL
4. **Monitor logs** for errors
5. **Set up monitoring** (optional)

## 📝 Notes

- The MCP server is bundled into `dist/mcp-server/index.js` during build
- No need to set `MARRIOTT_MCP_SERVER_PATH` unless using custom path
- All platforms support environment variables
- HTTPS is required for ChatGPT integration
- Free tiers may have rate limits or sleep after inactivity

## 🆘 Support

If you encounter issues:
1. Check deployment logs
2. Verify build succeeded
3. Test endpoints manually
4. Check environment variables
5. Review platform documentation

---

**Happy Deploying! 🚀**

