#!/usr/bin/env node
/**
 * Script to ensure MCP server is available in dist/mcp-server/index.js
 * This runs after TypeScript compilation to restore the pre-bundled MCP server
 */

import { existsSync, mkdirSync, copyFileSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Paths
const mcpDest = join(projectRoot, 'dist', 'mcp-server', 'index.js');
const mcpSource = join(projectRoot, '..', 'mcp-local-main', 'dist', 'index.js');

console.log('🔍 Ensuring MCP server is available...');
console.log('   Destination:', mcpDest);
console.log('   Source:', mcpSource);
console.log('   Project root:', projectRoot);

try {
  // Create directory if it doesn't exist
  const distDir = dirname(mcpDest);
  if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true });
    console.log('✅ Created directory:', distDir);
  }

  // Check if file already exists (should be from git checkout)
  if (existsSync(mcpDest)) {
    const stats = statSync(mcpDest);
    console.log('✅ MCP server already exists at:', mcpDest);
    console.log('   File size:', stats.size, 'bytes');
    process.exit(0);
  }

  console.log('⚠️  MCP server not found, attempting to restore...');

  // Method 1: Try to restore from git (file should be in repository)
  console.log('📦 Method 1: Restoring from git...');
  try {
    // Try git show to get file from HEAD
    const gitFile = execSync('git show HEAD:dist/mcp-server/index.js', {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: 'pipe',
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });
    
    // Write file to destination
    writeFileSync(mcpDest, gitFile, 'utf8');
    
    if (existsSync(mcpDest)) {
      console.log('✅ Restored MCP server from git HEAD');
      console.log('   File size:', statSync(mcpDest).size, 'bytes');
      process.exit(0);
    }
  } catch (gitError) {
    console.log('⚠️  Could not restore from git:', gitError.message.substring(0, 100));
  }

  // Method 2: Try to copy from source (mcp-local-main)
  console.log('📦 Method 2: Copying from source...');
  if (existsSync(mcpSource)) {
    copyFileSync(mcpSource, mcpDest);
    console.log('✅ Copied MCP server from source');
    console.log('   File size:', statSync(mcpDest).size, 'bytes');
    process.exit(0);
  } else {
    console.log('⚠️  Source not found:', mcpSource);
  }

  // Method 3: Try git checkout (in case file exists in working tree)
  console.log('📦 Method 3: Trying git checkout...');
  try {
    execSync('git checkout -- dist/mcp-server/index.js', {
      cwd: projectRoot,
      stdio: 'pipe'
    });
    
    if (existsSync(mcpDest)) {
      console.log('✅ Restored MCP server via git checkout');
      process.exit(0);
    }
  } catch (checkoutError) {
    console.log('⚠️  Git checkout failed');
  }

  // All methods failed
  console.error('❌ MCP server not found after all attempts!');
  console.error('');
  console.error('Checked paths:');
  console.error('   - Destination:', mcpDest, existsSync(mcpDest) ? '✅' : '❌');
  console.error('   - Source:', mcpSource, existsSync(mcpSource) ? '✅' : '❌');
  console.error('   - Project root:', projectRoot);
  console.error('   - Current directory:', process.cwd());
  console.error('');
  console.error('Debugging info:');
  try {
    console.error('   - Git root:', execSync('git rev-parse --show-toplevel', { 
      cwd: projectRoot, 
      encoding: 'utf8',
      stdio: 'pipe' 
    }).trim());
    console.error('   - Git files:', execSync('git ls-files dist/mcp-server/', { 
      cwd: projectRoot, 
      encoding: 'utf8',
      stdio: 'pipe' 
    }).trim() || 'none');
  } catch (e) {
    console.error('   - Git not available or not in git repo');
  }
  console.error('');
  console.error('💡 Solutions:');
  console.error('   1. Ensure dist/mcp-server/index.js is committed and pushed to git');
  console.error('   2. Run: git add dist/mcp-server/index.js && git commit && git push');
  console.error('   3. Verify: git ls-files dist/mcp-server/index.js');
  console.error('   4. Or ensure mcp-local-main is available during build');
  
  process.exit(1);
} catch (error) {
  console.error('❌ Error ensuring MCP server:', error.message);
  console.error('   Stack:', error.stack);
  process.exit(1);
}
