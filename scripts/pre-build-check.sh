#!/bin/bash
# Pre-build check script to verify MCP server will be available

set -e

echo "🔍 Checking MCP server availability..."

# Check if mcp-local-main exists
if [ ! -d "../mcp-local-main" ]; then
    echo "❌ ERROR: mcp-local-main directory not found!"
    echo "   Expected: ../mcp-local-main"
    echo "   Current directory: $(pwd)"
    echo "   Contents of parent directory:"
    ls -la ../
    exit 1
fi

echo "✅ Found mcp-local-main directory"

# Check if dist/index.js exists (or will exist after build)
if [ ! -f "../mcp-local-main/dist/index.js" ]; then
    echo "⚠️  MCP server not built yet, will build during build process"
else
    echo "✅ Found pre-built MCP server"
fi

echo "✅ Pre-build check passed"

