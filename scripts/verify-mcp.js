#!/usr/bin/env node
/**
 * Verification script to check if MCP server file exists
 * This runs at startup to verify the file is available
 */

import { existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Paths
const mcpPath = join(projectRoot, 'dist', 'mcp-server', 'index.js');

console.log('🔍 Verifying MCP server file...');
console.log('   Path:', mcpPath);
console.log('   Project root:', projectRoot);
console.log('   Current directory:', process.cwd());
console.log('   __dirname:', __dirname);

if (existsSync(mcpPath)) {
  const stats = statSync(mcpPath);
  console.log('✅ MCP server file exists');
  console.log('   File size:', stats.size, 'bytes');
  console.log('   File path:', mcpPath);
  process.exit(0);
} else {
  console.error('❌ MCP server file NOT found');
  console.error('   Expected path:', mcpPath);
  console.error('   Project root:', projectRoot);
  console.error('   Current directory:', process.cwd());
  console.error('');
  console.error('💡 Solution:');
  console.error('   1. Ensure build script ran: npm run ensure:mcp:server');
  console.error('   2. Verify file is in git: git ls-files dist/mcp-server/index.js');
  console.error('   3. Check Render build logs for ensure-mcp.js output');
  process.exit(1);
}

