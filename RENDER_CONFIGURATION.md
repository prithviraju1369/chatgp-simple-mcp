# 🔧 Render Configuration Guide

## Problem

Render was detecting the `Dockerfile` and trying to use Docker build, which caused `npm ci` to fail because the lock file was out of sync.

## Solution

Render should use the **Node.js environment** (not Docker) as configured in `render.yaml`.

## Configuration Steps

### 1. Verify Render Service Settings

In Render Dashboard:
1. Go to your service
2. Click "Settings"
3. Verify:
   - **Environment**: `Node` (NOT Docker)
   - **Build Command**: `npm install && npm run build:ts && (npm run build:mcp:optional || true) && (npm run copy:mcp:optional || true)`
   - **Start Command**: `npm run start:hotels`

### 2. Ensure render.yaml is Used

The `render.yaml` file configures:
- Environment: `node`
- Build command: Uses `npm install` (not `npm ci`)
- Start command: `npm run start:hotels`

Render should automatically detect and use `render.yaml` when you:
1. Connect your GitHub repository
2. Select the `chatgp-simple-mcp` directory
3. Render detects `render.yaml` and uses those settings

### 3. Prevent Docker Detection (Optional)

If Render is still trying to use Docker:

**Option A: Remove Dockerfile from Render**
- Rename Dockerfile to `Dockerfile.backup`
- Or move it to a subdirectory
- Render won't detect it

**Option B: Use .renderignore**
- Create `.renderignore` file
- Add `Dockerfile` to it
- Render will ignore it

**Option C: Configure Service Manually**
- In Render dashboard, explicitly set:
  - Environment: `Node`
  - Build Command: `npm install && npm run build:ts && (npm run build:mcp:optional || true) && (npm run copy:mcp:optional || true)`
  - Start Command: `npm run start:hotels`

## Current Configuration

### render.yaml
```yaml
services:
  - type: web
    name: marriott-hotel-search
    env: node                    # ← Uses Node.js, NOT Docker
    region: oregon
    plan: free
    buildCommand: npm install && npm run build:ts && (npm run build:mcp:optional || true) && (npm run copy:mcp:optional || true)
    startCommand: npm run start:hotels
```

### Why This Works

1. **`env: node`** - Tells Render to use Node.js environment
2. **`npm install`** - Allows npm to update lock file if needed
3. **Optional MCP build** - Won't fail if MCP server isn't available
4. **TypeScript first** - Always compiles, regardless of MCP build

## Verification

After deployment, check logs for:
- ✅ "Installing dependencies..."
- ✅ "npm install" completes successfully
- ✅ "Building TypeScript..."
- ✅ Build completes
- ✅ Server starts successfully

## If Still Using Docker

If Render is still trying to use Docker:

1. **Check Service Settings:**
   - Go to Render dashboard
   - Service → Settings
   - Verify "Environment" is "Node"

2. **Check Build Logs:**
   - Look for "Using Dockerfile" or "Using Node.js"
   - Should say "Using Node.js"

3. **Recreate Service:**
   - If Docker is still being used, delete and recreate the service
   - Make sure to select "Node" environment
   - Or let `render.yaml` configure it automatically

## Dockerfile (For Other Platforms)

The `Dockerfile` is still useful for:
- Railway (if using Docker)
- Fly.io (if using Docker)
- Local Docker builds
- Other containerized deployments

But for Render, we use the Node.js environment directly.

---

**Status**: ✅ Configured - Render uses Node.js environment from `render.yaml`

