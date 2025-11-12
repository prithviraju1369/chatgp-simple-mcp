# 🔧 MCP Server Bundle Fix

## Problem

The error shows:
```
Error: Cannot find module '/mcp-local-main/dist/index.js'
```

This means:
1. The bundled MCP server (`dist/mcp-server/index.js`) doesn't exist
2. The app is falling back to relative path (`../../mcp-local-main/dist/index.js`)
3. But in deployment, this resolves to `/mcp-local-main/dist/index.js` which doesn't exist

## Root Cause

The build command in `render.yaml` was using `|| true` which allows the MCP build/copy to fail silently:

```yaml
buildCommand: npm install && npm run build:ts && (npm run build:mcp:optional || true) && (npm run copy:mcp:optional || true)
```

This means:
- If MCP build fails → build continues (silent failure)
- If MCP copy fails → build continues (silent failure)
- Result: MCP server is never bundled, but build succeeds
- Runtime: App can't find MCP server → fails

## Solution

### 1. Updated render.yaml
Changed build command to require MCP server:
```yaml
buildCommand: npm install && npm run build:ts && npm run build:mcp && npm run copy:mcp && test -f dist/mcp-server/index.js || (echo "ERROR: MCP server not found after build!" && ls -la dist/ && ls -la dist/mcp-server/ 2>&1 || echo "dist/mcp-server/ does not exist" && exit 1)
```

This:
- Removes `|| true` - build will fail if MCP steps fail
- Verifies MCP server exists after build
- Shows detailed error if missing

### 2. Updated copy-mcp.js
Changed to fail if source doesn't exist:
- Now exits with code 1 (was 0)
- Shows detailed error messages
- Lists checked paths

### 3. Repository Structure

**IMPORTANT**: `mcp-local-main` must be in your Git repository!

Your repository structure should be:
```
your-repo/
  ├── chatgp-simple-mcp/
  │   ├── src/
  │   ├── package.json
  │   ├── render.yaml
  │   └── ...
  └── mcp-local-main/          ← MUST BE IN REPO!
      ├── src/
      ├── package.json
      ├── dist/
      │   └── index.js
      └── ...
```

## Verification

### Check Repository Structure
```bash
# In your repository root
ls -la
# Should show both directories:
# - chatgp-simple-mcp/
# - mcp-local-main/
```

### Check Git Status
```bash
git status
# Should show mcp-local-main/ directory
# If not, add it:
git add mcp-local-main/
git commit -m "Add mcp-local-main to repository"
git push
```

### Test Build Locally
```bash
cd chatgp-simple-mcp
npm install
npm run build:ts
npm run build:mcp
npm run copy:mcp

# Verify MCP server was copied
ls -la dist/mcp-server/index.js
# Should show the file exists
```

## Next Steps

1. **Ensure mcp-local-main is in Git repository:**
   ```bash
   # Check if it's in the repo
   git ls-files | grep mcp-local-main
   
   # If not, add it
   git add mcp-local-main/
   git commit -m "Add mcp-local-main for deployment"
   git push
   ```

2. **Commit the fixes:**
   ```bash
   git add render.yaml scripts/copy-mcp.js package.json
   git commit -m "Fix MCP server bundling - require MCP server in build"
   git push
   ```

3. **Redeploy on Render:**
   - Render will automatically redeploy
   - Build will now fail if MCP server isn't available
   - Check build logs for MCP server bundling

## Expected Build Output

After fix, you should see in Render logs:
```
✅ Building TypeScript...
✅ Building MCP server...
✅ Copied MCP server: .../mcp-local-main/dist/index.js → .../dist/mcp-server/index.js
✅ Build complete
```

## If Build Still Fails

### Check 1: Is mcp-local-main in the repository?
```bash
git ls-files mcp-local-main/
# Should list files
```

### Check 2: Does mcp-local-main build locally?
```bash
cd mcp-local-main
npm install
npm run build
ls -la dist/index.js
# Should exist
```

### Check 3: Check Render build logs
Look for:
- `✅ Building MCP server...`
- `✅ Copied MCP server...`
- `ERROR: MCP server not found after build!` (if failing)

### Check 4: Repository structure on Render
Render should see:
```
/app/chatgp-simple-mcp/
/app/mcp-local-main/
```

If Render is only cloning `chatgp-simple-mcp` directory, it won't see `mcp-local-main`.

**Solution**: Make sure Render is cloning the entire repository, not just the `chatgp-simple-mcp` subdirectory.

## Render Configuration

In Render dashboard:
1. Go to your service
2. Settings → Build & Deploy
3. Check "Root Directory" - should be empty or `/` (not `/chatgp-simple-mcp`)
4. This ensures Render sees both directories

Alternatively, if you're using a monorepo setup:
- Render should clone the entire repository
- Then set "Root Directory" to `chatgp-simple-mcp`
- But `mcp-local-main` should still be accessible at `../mcp-local-main`

---

**Status**: ✅ Fixed - Build now requires MCP server bundling

