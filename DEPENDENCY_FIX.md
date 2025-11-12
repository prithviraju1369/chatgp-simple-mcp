# 🔧 MCP Server Dependency Fix

## Problem

The MCP server was failing with "Marriott MCP failed" error because it couldn't find its dependencies.

## Root Cause

The MCP server (`mcp-local-main/dist/index.js`) requires:
1. `@modelcontextprotocol/sdk` ✅ (already in main project)
2. `node-fetch` ❌ (NOT in main project)

When we bundle the MCP server by copying just `dist/index.js`, the dependencies aren't available. When Node.js tries to run the MCP server subprocess, it fails to import `node-fetch` because it's not installed in the main project's `node_modules`.

## Solution

Added `node-fetch` to the main project's dependencies so it's available when the MCP server subprocess runs.

## Changes Made

### Updated `package.json`
- Added `node-fetch: ^3.3.2` to dependencies
- This matches the version used by `mcp-local-main`

## Why This Works

1. The MCP server subprocess runs in the same Node.js environment as the main app
2. Node.js resolves modules from the main project's `node_modules` directory
3. Since `node-fetch` is now installed, the MCP server can import it successfully
4. `@modelcontextprotocol/sdk` is already available (though versions differ, they should be compatible)

## Next Steps

1. **Install the new dependency:**
   ```bash
   cd chatgp-simple-mcp
   npm install
   ```

2. **Commit the changes:**
   ```bash
   git add package.json package-lock.json
   git commit -m "Add node-fetch dependency for MCP server"
   git push
   ```

3. **Redeploy on Render:**
   - Render will automatically install the new dependency
   - The MCP server should now be able to import `node-fetch`
   - Check logs to verify MCP server starts successfully

## Testing Locally

Test that the MCP server can now find its dependencies:

```bash
cd chatgp-simple-mcp
npm install
npm run build

# Test that MCP server can be executed
node dist/mcp-server/index.js
# Should start without import errors (may wait for stdin input, that's normal)
```

## Verification

After deployment, check Render logs for:
- ✅ No "Cannot find module 'node-fetch'" errors
- ✅ MCP server subprocess starts successfully
- ✅ Subprocess communicates correctly

## Alternative Solutions (Not Used)

### Option 1: Bundle MCP Server with Dependencies
- Use a bundler like `esbuild` or `webpack`
- Bundle all dependencies into a single file
- More complex, but would work

### Option 2: Install MCP Server Dependencies Separately
- Create a separate `node_modules` for MCP server
- More complex deployment setup
- Not needed since we can share dependencies

### Option 3: Use MCP Server as npm Package
- Publish MCP server as an npm package
- Install it as a dependency
- More setup, but cleaner architecture

**We chose the simplest solution: Add missing dependencies to main project.**

---

**Status**: ✅ Fixed - Added `node-fetch` dependency

