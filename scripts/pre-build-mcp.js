#!/usr/bin/env node
/**
 * Pre-build script to restore MCP server file BEFORE TypeScript compilation
 * This ensures the file is available even if TypeScript cleans the dist directory
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
const backupDest = join(projectRoot, '.mcp-server-backup', 'index.js');

console.log('🔧 Pre-build: Ensuring MCP server is available...');
console.log('   Destination:', mcpDest);
console.log('   Backup:', backupDest);
console.log('   Project root:', projectRoot);

try {
  // Create backup directory if it doesn't exist
  const backupDir = dirname(backupDest);
  if (!existsSync(backupDir)) {
    mkdirSync(backupDir, { recursive: true });
    console.log('✅ Created backup directory:', backupDir);
  }

  // Create dist directory if it doesn't exist
  const distDir = dirname(mcpDest);
  if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true });
    console.log('✅ Created dist directory:', distDir);
  }

  // Check if file already exists in dist
  if (existsSync(mcpDest)) {
    const stats = statSync(mcpDest);
    if (stats.size > 0) {
      console.log('✅ MCP server already exists in dist');
      console.log('   File size:', stats.size, 'bytes');
      
      // Also create backup
      copyFileSync(mcpDest, backupDest);
      console.log('✅ Created backup of MCP server');
      process.exit(0);
    }
  }

  // Try to restore from git BEFORE TypeScript compilation
  console.log('📦 Restoring MCP server from git...');
  try {
    // Method 1: Try git show (works even if file was removed)
    const gitFile = execSync('git show HEAD:dist/mcp-server/index.js', {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: 'pipe',
      maxBuffer: 10 * 1024 * 1024
    });
    
    if (gitFile && gitFile.length > 0) {
      // Write to both dist and backup
      writeFileSync(mcpDest, gitFile, 'utf8');
      writeFileSync(backupDest, gitFile, 'utf8');
      
      if (existsSync(mcpDest) && statSync(mcpDest).size > 0) {
        console.log('✅ Restored MCP server from git to dist');
        console.log('✅ Created backup of MCP server');
        console.log('   File size:', statSync(mcpDest).size, 'bytes');
        process.exit(0);
      }
    }
  } catch (gitError) {
    console.log('⚠️  Could not restore from git:', gitError.message.substring(0, 100));
  }

  // Try to restore from backup if it exists
  if (existsSync(backupDest)) {
    const stats = statSync(backupDest);
    if (stats.size > 0) {
      copyFileSync(backupDest, mcpDest);
      console.log('✅ Restored MCP server from backup');
      console.log('   File size:', stats.size, 'bytes');
      process.exit(0);
    }
  }

  // Check if file exists in git (but not restored yet)
  try {
    execSync('git ls-files dist/mcp-server/index.js', {
      cwd: projectRoot,
      stdio: 'pipe'
    });
    console.log('⚠️  File exists in git but could not be restored');
    console.log('   This might be a shallow clone or git issue');
  } catch (e) {
    console.log('⚠️  File not found in git index');
  }

  console.log('⚠️  MCP server not found, but continuing build...');
  console.log('   The ensure-mcp.js script will try to restore it after TypeScript compilation');
  process.exit(0); // Don't fail the build, let post-build script handle it
} catch (error) {
  console.error('❌ Error in pre-build script:', error.message);
  console.error('   Stack:', error.stack);
  // Don't fail the build, let post-build script handle it
  process.exit(0);
}

