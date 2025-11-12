# 🔧 Render Runtime Fix - Restore MCP Server at Startup

## Problem

The MCP server file is restored during build, but it's **not found at runtime** on Render:
```
❌ MCP server not found at any expected path:
   - Bundled: /app/dist/mcp-server/index.js
   - Relative: /mcp-local-main/dist/index.js
   - __dirname: /app/dist
```

## Root Cause

**Render uses a clean environment for runtime** - files created during build might not persist to runtime. Even though we restore the file during build, Render might:
1. Clean the workspace between build and runtime
2. Use a fresh checkout for runtime
3. Not persist files from build to runtime

## Solution

**Restore the MCP server file at runtime** (in the start command) before the server starts. This ensures the file is available even if Render cleans files between build and runtime.

### Implementation

1. **Created `scripts/runtime-restore-mcp.js`**
   - Runs at startup (before server starts)
   - Restores file from git: `git show HEAD:dist/mcp-server/index.js`
   - Tries multiple methods: backup, git show, git checkout
   - Works even in clean environments

2. **Updated `package.json`**
   - `start:hotels` now runs `runtime-restore-mcp.js` first
   - Then runs `verify-mcp.js` to verify file exists
   - Finally starts the server

3. **Updated `render.yaml`**
   - Start command uses `npm run start:hotels`
   - Which runs runtime restore, verification, then server

## Build Flow

```
1. Build Stage:
   - npm install
   - npm run pre:build:mcp (restore from git, create backup)
   - npm run build:ts (compile TypeScript)
   - npm run ensure:mcp:server (verify file exists)
   - File should exist at end of build

2. Runtime Stage (NEW):
   - npm run start:hotels
   - node scripts/runtime-restore-mcp.js (restore from git at runtime)
   - node scripts/verify-mcp.js (verify file exists)
   - node dist/hotel-server.js (start server)
```

## Expected Runtime Logs

After deployment, you should see in Render runtime logs:

```
🔧 Runtime: Ensuring MCP server is available...
   Destination: /app/dist/mcp-server/index.js
   Project root: /app
   Current directory: /app
⚠️  MCP server not found, attempting to restore at runtime...
📦 Restoring from git repository...
✅ Restored MCP server from git at runtime
   File size: 30004 bytes

🔍 Verifying MCP server file...
✅ MCP server file exists
   File size: 30004 bytes
   File path: /app/dist/mcp-server/index.js

🏨 Marriott Hotel Search running at http://localhost:10000
```

## When calling `marriott_search_hotels`:

```
✅ Found bundled MCP server at: /app/dist/mcp-server/index.js
🔧 Spawning subprocess: /app/dist/mcp-server/index.js
```

## Next Steps

### 1. Commit and Push Changes

```bash
cd chatgp-simple-mcp

# Add all changes
git add scripts/runtime-restore-mcp.js
git add package.json render.yaml
git add RENDER_RUNTIME_FIX.md

# Commit
git commit -m "Add runtime MCP server restoration for Render"

# Push
git push origin main
```

### 2. Monitor Render Runtime Logs

After pushing, check Render runtime logs for:
- `🔧 Runtime: Ensuring MCP server is available...`
- `✅ Restored MCP server from git at runtime`
- `✅ MCP server file exists`
- `🏨 Marriott Hotel Search running`

### 3. Test Endpoint

Test the endpoint:
```bash
curl https://chatgp-simple-mcp-nily.onrender.com/.well-known/apps.json
```

Test `marriott_search_hotels` - should see:
```
✅ Found bundled MCP server at: /app/dist/mcp-server/index.js
```

## Troubleshooting

### Issue: File not found at runtime

**Check runtime logs for:**
1. `runtime-restore-mcp.js` output
2. Whether git restore succeeded
3. Whether file exists after restore
4. Error messages with debugging info

**Possible causes:**
1. Git not available at runtime
2. File not in remote repository
3. Git command failing
4. File path wrong

**Solution:**
1. Verify file is in remote: `git show origin/main:dist/mcp-server/index.js`
2. Check Render runtime logs for script output
3. Verify git is available at runtime
4. Check file path in logs

### Issue: Git restore fails

**Check:**
1. Git is available: `which git` in runtime logs
2. File is in repository: `git ls-files dist/mcp-server/index.js`
3. Git command works: `git show HEAD:dist/mcp-server/index.js`

**Solution:**
1. Verify file is in remote repository
2. Check Render git configuration
3. Verify repository is cloned correctly

## Files Changed

1. `scripts/runtime-restore-mcp.js` - New runtime restore script
2. `package.json` - Updated start command
3. `render.yaml` - Updated start command (uses npm run start:hotels)
4. `RENDER_RUNTIME_FIX.md` - This documentation

## Key Difference

**Before:** File was restored during build, but didn't persist to runtime.

**After:** File is restored at runtime (before server starts), ensuring it's always available.

## Benefits

1. **Works even if Render cleans files** - File is restored from git at runtime
2. **No dependency on build artifacts** - File is restored from git repository
3. **Reliable** - Multiple fallback methods ensure file is available
4. **Fast** - Git restore is quick (~30KB file)

---

**Status**: ✅ Complete - Runtime restoration implemented

**Next Action**: Commit and push changes, then monitor Render runtime logs

