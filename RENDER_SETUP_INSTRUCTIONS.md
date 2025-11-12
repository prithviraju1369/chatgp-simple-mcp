# 🚀 Render Setup Instructions

## Critical Configuration

For the MCP server to work, Render must be configured to see both directories:
- `chatgp-simple-mcp/` (main app)
- `mcp-local-main/` (MCP server)

## Setup Steps

### Step 1: Verify Repository Structure

Your repository should have:
```
your-repo/
  ├── chatgp-simple-mcp/
  │   ├── src/
  │   ├── package.json
  │   ├── render.yaml
  │   └── ...
  └── mcp-local-main/
      ├── src/
      ├── package.json
      └── ...
```

### Step 2: Configure Render Service

**In Render Dashboard:**

1. **Go to your service** → Settings

2. **Root Directory:**
   - **Option A (Recommended)**: Leave empty or set to `/`
     - This makes Render clone the entire repository
     - Then set "Root Directory" to `chatgp-simple-mcp` in service settings
     - Render will see both directories from the root
   
   - **Option B**: Set to repository root (`/`)
     - Update build command to: `cd chatgp-simple-mcp && [build commands]`
     - Update start command to: `cd chatgp-simple-mcp && npm run start:hotels`

3. **Build Command:**
   ```
   bash scripts/pre-build-check.sh && npm install && npm run build:ts && npm run build:mcp && npm run copy:mcp && test -f dist/mcp-server/index.js && echo "✅ MCP server bundled successfully" || exit 1
   ```

4. **Start Command:**
   ```
   npm run start:hotels
   ```

### Step 3: Verify Configuration

After deployment, check build logs for:
- ✅ `Found mcp-local-main directory`
- ✅ `Building MCP server...`
- ✅ `Copied MCP server...`
- ✅ `MCP server bundled successfully`

### Step 4: Test

1. Deploy the service
2. Check logs for MCP server bundling
3. Test the endpoint:
   ```bash
   curl https://your-app.onrender.com/.well-known/apps.json
   ```

## Troubleshooting

### Issue: "MCP server not found"

**Check 1: Root Directory**
- Go to Render Dashboard → Service → Settings
- Check "Root Directory" setting
- Should be empty or `/` (for repository root)
- Or `chatgp-simple-mcp` if repository root is used

**Check 2: Build Logs**
- Look for "Found mcp-local-main directory"
- If not found, Render can't see the directory
- Update Root Directory configuration

**Check 3: Repository Structure**
- Verify both directories are in Git:
  ```bash
  git ls-files | grep -E "(chatgp-simple-mcp|mcp-local-main)"
  ```

### Issue: "Cannot find module '../mcp-local-main'"

**Solution:**
- Render's working directory doesn't include `mcp-local-main`
- Configure Root Directory to repository root
- Or ensure `mcp-local-main` is accessible from build directory

## Alternative: Pre-bundle MCP Server

If you can't configure Render to see both directories:

1. **Build locally:**
   ```bash
   cd chatgp-simple-mcp
   npm run build:mcp
   npm run copy:mcp
   ```

2. **Commit bundled file:**
   ```bash
   git add dist/mcp-server/index.js
   git commit -m "Add pre-bundled MCP server"
   git push
   ```

3. **Update build command:**
   ```bash
   npm install && npm run build:ts && test -f dist/mcp-server/index.js || (npm run build:mcp && npm run copy:mcp)
   ```

This way, the MCP server is already bundled in the repository.

---

**Status**: ⚠️ Requires Render configuration - Root Directory must be set correctly

