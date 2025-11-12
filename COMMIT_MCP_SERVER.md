# 📦 Commit Pre-bundled MCP Server

## Problem

Render deployment can't find `mcp-local-main` directory because Render might only be deploying from the `chatgp-simple-mcp` directory, not the entire repository.

## Solution

Commit the pre-bundled MCP server file to Git so it's always available, even if the build process can't access `mcp-local-main`.

## Steps

### 1. Build MCP Server Locally

```bash
cd chatgp-simple-mcp
npm run build:mcp
npm run copy:mcp
```

### 2. Verify File Exists

```bash
ls -la dist/mcp-server/index.js
# Should show the file exists
```

### 3. Update .gitignore

Make sure `dist/mcp-server/index.js` is NOT ignored:

```bash
# Check .gitignore
cat .gitignore

# If dist/ is ignored, we need to allow dist/mcp-server/
# Add to .gitignore:
# dist/*
# !dist/mcp-server/
# !dist/mcp-server/index.js
```

### 4. Add to Git

```bash
# Add the bundled MCP server
git add dist/mcp-server/index.js

# Commit
git commit -m "Add pre-bundled MCP server for deployment"

# Push
git push
```

### 5. Update Build Process

The build process now uses `ensure:mcp` which:
1. Checks if pre-bundled MCP server exists
2. If not, tries to build it (if `mcp-local-main` is available)
3. Fails if neither is available

## Benefits

1. **Always available**: MCP server is in the repository
2. **Faster builds**: No need to build MCP server during deployment
3. **More reliable**: Doesn't depend on directory structure
4. **Works on Render**: Doesn't require access to `mcp-local-main`

## Maintenance

When you update `mcp-local-main`:

1. **Rebuild locally:**
   ```bash
   cd chatgp-simple-mcp
   npm run build:mcp
   npm run copy:mcp
   ```

2. **Commit updated file:**
   ```bash
   git add dist/mcp-server/index.js
   git commit -m "Update pre-bundled MCP server"
   git push
   ```

---

**Status**: ✅ Solution - Commit pre-bundled MCP server to Git

