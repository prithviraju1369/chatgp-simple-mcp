#!/usr/bin/env node
/**
 * Cross-platform script to copy MCP server to dist folder
 */

import { existsSync, mkdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const distDir = join(projectRoot, 'dist', 'mcp-server');
const mcpSource = join(projectRoot, '..', 'mcp-local-main', 'dist', 'index.js');
const mcpDest = join(distDir, 'index.js');

try {
  // Create dist/mcp-server directory if it doesn't exist
  if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true });
    console.log('✅ Created directory:', distDir);
  }

  // Check if source file exists
  if (!existsSync(mcpSource)) {
    console.warn('⚠️  MCP server source not found:', mcpSource);
    console.warn('⚠️  Skipping copy. Make sure mcp-local-main is built first.');
    process.exit(0);
  }

  // Copy MCP server file
  copyFileSync(mcpSource, mcpDest);
  console.log('✅ Copied MCP server:', mcpSource, '→', mcpDest);
} catch (error) {
  console.error('❌ Error copying MCP server:', error.message);
  process.exit(1);
}

