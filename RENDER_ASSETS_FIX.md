# ✅ Render MCP Server Fix - Assets Directory Solution

## Problem

The MCP server file is not found at runtime on Render, even though it's in git:
```
❌ MCP server not found at any expected path:
   - Bundled: /app/dist/mcp-server/index.js
   - Relative: /mcp-local-main/dist/index.js
   - __dirname: /app/dist
```

## Root Cause

**Render uses a clean environment for runtime** - files created during build might not persist. Even though the file is in `dist/mcp-server/index.js` in git, Render might:
1. Clean the workspace between build and runtime
2. Use a fresh checkout for runtime
3. Not persist files from build to runtime

## Solution

**Store the MCP server file in `assets/mcp-server/index.js`** (committed to git) and copy it to `dist/mcp-server/index.js` at runtime. This ensures the file is always available because:
1. The file is in a location that's always checked out from git
2. The file is copied at runtime (before server starts)
3. No dependency on build artifacts or git commands at runtime

## Implementation

### 1. Created `assets/mcp-server/index.js`
- MCP server file stored in assets directory
- Committed to git (always available)
- Not affected by TypeScript compilation
- Always checked out from git

### 2. Enhanced `scripts/runtime-restore-mcp.js`
- **Method 1:** Copy from `assets/mcp-server/index.js` (committed to git)
- **Method 2:** Restore from backup (created during build)
- **Method 3:** Restore from git `dist/mcp-server/index.js`
- **Method 4:** Restore from git `assets/mcp-server/index.js`
- **Method 5:** Git checkout
- **Method 6:** Search repository for file

### 3. Updated `package.json`
- `start:hotels` runs `runtime-restore-mcp.js` first
- Then runs `verify-mcp.js` to verify file exists
- Finally starts the server

### 4. Updated `.gitignore`
- Allow `assets/` directory to be committed
- Keep `dist/mcp-server/index.js` tracked (backup)
- Ignore `.mcp-server-backup/`

## Build Flow

```
1. Build Stage:
   - npm install
   - npm run pre:build:mcp (restore from git, create backup)
   - npm run build:ts (compile TypeScript)
   - npm run ensure:mcp:server (verify file exists)
   - File should exist at end of build

2. Runtime Stage:
   - npm run start:hotels
   - node scripts/runtime-restore-mcp.js
     → Copy from assets/mcp-server/index.js (Method 1)
     → File is now in dist/mcp-server/index.js
   - node scripts/verify-mcp.js (verify file exists)
   - node dist/hotel-server.js (start server)
```

## Expected Runtime Logs

After deployment, you should see in Render runtime logs:

```
🔧 Runtime: Ensuring MCP server is available...
   Destination: /app/dist/mcp-server/index.js
   Assets source: /app/assets/mcp-server/index.js
   Project root: /app
   Current directory: /app
   Node version: v20.x.x
⚠️  MCP server not found, attempting to restore at runtime...
📦 Method 1: Copying from assets directory...
✅ Restored MCP server from assets directory
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
git add assets/mcp-server/index.js
git add scripts/runtime-restore-mcp.js
git add scripts/pre-build-mcp.js
git add scripts/ensure-mcp.js
git add scripts/verify-mcp.js
git add package.json render.yaml .gitignore
git add RENDER_ASSETS_FIX.md

# Commit
git commit -m "Add assets directory and runtime restore for MCP server on Render"

# Push
git push origin main
```

### 2. Verify File is in Remote

```bash
# Check if file is in remote
git show origin/main:assets/mcp-server/index.js | head -5

# If file is NOT in remote, it will be added after commit
```

### 3. Monitor Render Runtime Logs

After pushing, check Render runtime logs for:
- `🔧 Runtime: Ensuring MCP server is available...`
- `📦 Method 1: Copying from assets directory...`
- `✅ Restored MCP server from assets directory`
- `✅ MCP server file exists`
- `🏨 Marriott Hotel Search running`

### 4. Test Endpoint

Test the endpoint:
```bash
curl https://chatgp-simple-mcp-nily.onrender.com/.well-known/apps.json
```

Test `marriott_search_hotels` - should see:
```
✅ Found bundled MCP server at: /app/dist/mcp-server/index.js
🔧 Spawning subprocess: /app/dist/mcp-server/index.js
```

## Troubleshooting

### Issue: File not found at runtime

**Check runtime logs for:**
1. `runtime-restore-mcp.js` output
2. Whether assets file exists
3. Whether file is copied successfully
4. Error messages with debugging info

**Possible causes:**
1. Assets file not committed/pushed
2. Assets file not in remote repository
3. Runtime restore script not running
4. File path wrong

**Solution:**
1. Verify file is committed: `git ls-files assets/mcp-server/index.js`
2. Verify file is in remote: `git show origin/main:assets/mcp-server/index.js`
3. Check Render runtime logs for script output
4. Verify start command uses `npm run start:hotels`

### Issue: Assets file not found

**Check:**
1. File is committed: `git ls-files assets/mcp-server/index.js`
2. File is in remote: `git show origin/main:assets/mcp-server/index.js`
3. .gitignore allows assets: `!assets/**`

**Solution:**
1. Commit assets file: `git add assets/mcp-server/index.js`
2. Push to remote: `git push origin main`
3. Verify in remote: `git show origin/main:assets/mcp-server/index.js`

## Files Changed

1. `assets/mcp-server/index.js` - New assets file (committed to git)
2. `scripts/runtime-restore-mcp.js` - Enhanced with assets copy (Method 1)
3. `scripts/pre-build-mcp.js` - Pre-build script (restores from git)
4. `scripts/ensure-mcp.js` - Post-build script (verifies file exists)
5. `scripts/verify-mcp.js` - Verification script (verifies at startup)
6. `package.json` - Updated start command
7. `render.yaml` - Updated build and start commands
8. `.gitignore` - Allow assets directory

## Key Difference

**Before:** File was in `dist/mcp-server/index.js` in git, but might not persist to runtime.

**After:** File is in `assets/mcp-server/index.js` in git (always checked out), and copied to `dist/mcp-server/index.js` at runtime.

## Benefits

1. **Always available:** File is in assets directory (always checked out)
2. **No git dependency:** File is copied from assets (no git commands needed)
3. **Reliable:** Multiple fallback methods ensure file is available
4. **Fast:** File copy is instant (~30KB)

## Verification

- [x] Assets file exists locally
- [x] Assets file is not ignored by git
- [x] Runtime restore works locally (copies from assets)
- [x] File is restored successfully
- [ ] Assets file is committed to git
- [ ] Assets file is in remote repository
- [ ] Runtime restore works on Render
- [ ] File exists at runtime on Render
- [ ] Endpoint works correctly
- [ ] MCP server is found when calling `marriott_search_hotels`

---

**Status**: ✅ Complete - Assets directory solution implemented

**Next Action**: Commit and push changes, then monitor Render runtime logs

**Critical**: The assets file MUST be committed and pushed to git for this to work on Render!

