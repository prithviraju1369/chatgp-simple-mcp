#!/bin/bash
# Build verification script for Render
set -e

echo "🔨 Starting build..."
npm install

echo "📦 Building TypeScript..."
npm run build:ts

echo "✅ Verifying build output..."
if [ ! -f "dist/hotel-server.js" ]; then
    echo "❌ ERROR: dist/hotel-server.js not found!"
    echo "📁 Contents of dist/:"
    ls -la dist/ || echo "dist/ directory does not exist"
    exit 1
fi

echo "✅ Build verification passed!"
echo "📁 Build output:"
ls -la dist/

# Optional: Try to build MCP (won't fail if it doesn't exist)
echo "🔧 Attempting to build MCP server (optional)..."
npm run build:mcp:optional || true
npm run copy:mcp:optional || true

echo "🎉 Build complete!"

