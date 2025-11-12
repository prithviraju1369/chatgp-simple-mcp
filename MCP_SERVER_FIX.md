# 🔧 MCP Server Error Fix

## Problem

The deployment was showing error: **"Marriott MCP failed"**

This error occurs when the MCP server subprocess fails to execute or respond.

## Root Causes

1. **MCP server file not found** - The bundled MCP server might not be available
2. **Subprocess spawn failure** - Node.js might not be available or file permissions issue
3. **Process exits early** - MCP server crashes or exits before completing
4. **Timeout** - No timeout was set, process could hang indefinitely
5. **Poor error handling** - Generic error message doesn't show what actually failed

## Solution

I've improved the error handling with:

### 1. Better File Validation
- Checks if MCP server file exists before spawning
- Tries multiple paths (bundled, relative, environment variable)
- Clear error messages showing which paths were checked

### 2. Enhanced Error Handling
- Handles spawn errors explicitly
- Captures stdout and stderr separately
- Shows actual error messages instead of generic "MCP failed"
- Logs process exit codes and signals

### 3. Timeout Protection
- 30-second timeout to prevent hanging
- Cleans up process on timeout
- Shows partial stdout/stderr in timeout error

### 4. Better Logging
- Logs which MCP server path is being used
- Logs all subprocess communication
- Shows detailed error information

## Changes Made

### Updated `hotel-server.ts`
- Added file existence checks before spawning
- Added timeout (30 seconds)
- Enhanced error messages with actual error details
- Better process cleanup
- Improved logging for debugging

## What to Check in Render Logs

When deploying, check the logs for:

1. **File path confirmation:**
   ```
   ✅ Found bundled MCP server at: /app/dist/mcp-server/index.js
   ```
   OR
   ```
   ❌ MCP server not found at any expected path
   ```

2. **Subprocess spawn:**
   ```
   🔧 Spawning subprocess: /app/dist/mcp-server/index.js
   ```

3. **Process errors:**
   ```
   ❌ Subprocess stderr: [actual error message]
   ```
   OR
   ```
   Failed to spawn MCP server process: [error details]
   ```

4. **Process exit:**
   ```
   🔴 Subprocess closed with code: [exit code]
   ```

## Common Issues & Solutions

### Issue 1: MCP Server File Not Found
**Error:** `MCP server not found. Please ensure mcp-local-main is built and available.`

**Solution:**
1. Verify build includes MCP server:
   ```bash
   ls -la dist/mcp-server/index.js
   ```
2. Check build logs for MCP copy step
3. Ensure `mcp-local-main` is in the repository

### Issue 2: Spawn Error
**Error:** `Failed to spawn MCP server process: [error]`

**Solution:**
1. Check that Node.js is available in deployment environment
2. Verify file permissions
3. Check that MCP server file is executable
4. Verify file path is correct

### Issue 3: Process Exits Early
**Error:** `MCP server process exited with code [non-zero]`

**Solution:**
1. Check stderr output in logs - this will show the actual error
2. Verify MCP server dependencies are installed
3. Check MCP server code for runtime errors
4. Verify MCP server can run standalone:
   ```bash
   node dist/mcp-server/index.js
   ```

### Issue 4: Timeout
**Error:** `MCP server timeout after 30000ms`

**Solution:**
1. Check if MCP server is hanging
2. Verify network connectivity (if MCP server makes API calls)
3. Check if MCP server is waiting for input
4. Increase timeout if needed (currently 30 seconds)

## Next Steps

1. **Commit the changes:**
   ```bash
   git add .
   git commit -m "Improve MCP server error handling and diagnostics"
   git push
   ```

2. **Redeploy on Render:**
   - Render will automatically redeploy
   - Check build logs for MCP server bundling
   - Check runtime logs for detailed error messages

3. **Check Render Logs:**
   - Look for the new detailed error messages
   - Check which MCP server path is being used
   - Verify subprocess spawn and communication

## Testing Locally

Test the improved error handling:

```bash
cd chatgp-simple-mcp
npm run build:ts

# Test with missing MCP server
rm -rf dist/mcp-server
npm run start:hotels
# Should show clear error about MCP server not found

# Test with valid MCP server
npm run build
npm run start:hotels
# Should work correctly
```

## Expected Log Output

When working correctly, you should see:
```
✅ Found bundled MCP server at: /app/dist/mcp-server/index.js
🔧 Spawning subprocess: /app/dist/mcp-server/index.js
📨 Sending initialize: {...}
📨 Sending tool call with offset/limit: {...}
📤 Subprocess stdout chunk: {...}
✅ Parsed JSON response from subprocess, id: 1
🎯 Got result from subprocess, length: [length]
```

When failing, you'll now see detailed errors:
```
❌ MCP server not found at any expected path:
   - Bundled: /app/dist/mcp-server/index.js
   - Relative: /app/../../mcp-local-main/dist/index.js
   - __dirname: /app/dist
```

OR

```
Failed to spawn MCP server process: ENOENT: no such file or directory, spawn 'node'
Path: /app/dist/mcp-server/index.js
Make sure Node.js is available and the file is executable.
```

---

**Status**: ✅ Fixed - Better error handling and diagnostics added

