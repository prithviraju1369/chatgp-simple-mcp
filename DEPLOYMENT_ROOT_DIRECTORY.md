# 🔧 Render Root Directory Configuration

## Problem

The MCP server is not found during deployment because Render might be deploying from only the `chatgp-simple-mcp` directory, which means it can't access `../mcp-local-main`.

## Error

```
❌ MCP server not found at any expected path:
   - Bundled: /app/dist/mcp-server/index.js
   - Relative: /mcp-local-main/dist/index.js
   - __dirname: /app/dist
```

## Root Cause

Render needs to see both directories:
- `chatgp-simple-mcp/` (main app)
- `mcp-local-main/` (MCP server)

If Render is configured to deploy from `chatgp-simple-mcp` only, it won't see `mcp-local-main`.

## Solution

### Option 1: Configure Render Root Directory (Recommended)

In Render Dashboard:
1. Go to your service
2. Click "Settings"
3. Find "Root Directory" setting
4. Set it to empty (`/`) or the repository root
5. Update "Build Command" to include the directory:
   ```bash
   cd chatgp-simple-mcp && npm install && npm run build:ts && npm run build:mcp && npm run copy:mcp && test -f dist/mcp-server/index.js || exit 1
   ```
6. Update "Start Command" to:
   ```bash
   cd chatgp-simple-mcp && npm run start:hotels
   ```

### Option 2: Update render.yaml

If using `render.yaml`, ensure the root directory is set correctly. However, Render might need manual configuration in the dashboard.

### Option 3: Pre-bundle MCP Server (Alternative)

Commit the bundled MCP server file to git:

1. Build locally:
   ```bash
   cd chatgp-simple-mcp
   npm run build:mcp
   npm run copy:mcp
   ```

2. Add to git:
   ```bash
   git add dist/mcp-server/index.js
   git commit -m "Add pre-bundled MCP server"
   git push
   ```

3. Update build to skip MCP build if file exists:
   ```bash
   test -f dist/mcp-server/index.js || (npm run build:mcp && npm run copy:mcp)
   ```

## Current render.yaml

The current `render.yaml` assumes both directories are available. If Render is only cloning `chatgp-simple-mcp`, you need to:

1. **Check Render Service Settings:**
   - Root Directory: Should be `/` (repository root)
   - Not `/chatgp-simple-mcp`

2. **Or configure Render to use the entire repository:**
   - When creating the service, don't specify a subdirectory
   - Use the build command that changes into the directory

## Verification

After configuring, check Render build logs for:
- ✅ `Found mcp-local-main directory` (from pre-build-check.sh)
- ✅ `Building MCP server...`
- ✅ `Copied MCP server...`
- ✅ `MCP server bundled successfully`

## Alternative: Use Monorepo Setup

If you have a monorepo:

1. Ensure both directories are in the repository
2. Configure Render root directory to repository root
3. Update build commands to change into `chatgp-simple-mcp`

---

**Status**: ⚠️ Requires Render configuration - Root Directory must be set to repository root

