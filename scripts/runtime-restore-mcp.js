#!/usr/bin/env node
/**
 * Runtime script to restore MCP server file at startup
 * This runs BEFORE the server starts to ensure the file is available
 * Works even if Render cleans files between build and runtime
 * 
 * Priority:
 * 1. Check if file exists in dist/mcp-server/index.js
 * 2. Copy from assets/mcp-server/index.js (committed to git)
 * 3. Restore from git repository
 * 4. Try backup location
 */

import { existsSync, mkdirSync, copyFileSync, writeFileSync, statSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Paths
const mcpDest = join(projectRoot, 'dist', 'mcp-server', 'index.js');
const assetsSource = join(projectRoot, 'assets', 'mcp-server', 'index.js');
const backupDest = join(projectRoot, '.mcp-server-backup', 'index.js');

console.log('🔧 Runtime: Ensuring MCP server is available...');
console.log('   Destination:', mcpDest);
console.log('   Assets source:', assetsSource);
console.log('   Project root:', projectRoot);
console.log('   Current directory:', process.cwd());
console.log('   Node version:', process.version);

try {
  // Create directory if it doesn't exist
  const distDir = dirname(mcpDest);
  if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true });
    console.log('✅ Created directory:', distDir);
  }

  // Check if file already exists
  if (existsSync(mcpDest)) {
    const stats = statSync(mcpDest);
    if (stats.size > 0) {
      console.log('✅ MCP server already exists at:', mcpDest);
      console.log('   File size:', stats.size, 'bytes');
      process.stdout.write(`✅ MCP server already exists at: ${mcpDest}\n`);
      process.stdout.write(`   File size: ${stats.size} bytes\n`);
      process.exit(0);
    } else {
      console.log('⚠️  File exists but is empty, restoring...');
    }
  }

  console.log('⚠️  MCP server not found, attempting to restore at runtime...');

  // Method 1: Try to copy from assets directory (committed to git)
  console.log('📦 Method 1: Copying from assets directory...');
  if (existsSync(assetsSource)) {
    try {
      const stats = statSync(assetsSource);
      if (stats.size > 0) {
        copyFileSync(assetsSource, mcpDest);
        if (existsSync(mcpDest) && statSync(mcpDest).size > 0) {
          console.log('✅ Restored MCP server from assets directory');
          console.log('   File size:', stats.size, 'bytes');
          process.stdout.write(`✅ Restored MCP server from assets directory\n`);
          process.stdout.write(`   File size: ${stats.size} bytes\n`);
          process.exit(0);
        }
      }
    } catch (copyError) {
      console.log('⚠️  Copy from assets failed:', copyError.message);
    }
  } else {
    console.log('⚠️  Assets source not found:', assetsSource);
  }

  // Method 2: Try to restore from backup (created during build)
  console.log('📦 Method 2: Restoring from backup...');
  if (existsSync(backupDest)) {
    try {
      const stats = statSync(backupDest);
      if (stats.size > 0) {
        copyFileSync(backupDest, mcpDest);
        if (existsSync(mcpDest) && statSync(mcpDest).size > 0) {
          console.log('✅ Restored MCP server from backup');
          console.log('   File size:', stats.size, 'bytes');
          process.exit(0);
        }
      }
    } catch (backupError) {
      console.log('⚠️  Backup restore failed:', backupError.message);
    }
  } else {
    console.log('⚠️  Backup not found:', backupDest);
  }

  // Method 3: Try to restore from git (file is in repository)
  console.log('📦 Method 3: Restoring from git repository...');
  try {
    // Try git show - this works even in clean environments
    const gitFile = execSync('git show HEAD:dist/mcp-server/index.js', {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: 'pipe',
      maxBuffer: 10 * 1024 * 1024
    });
    
    if (gitFile && gitFile.length > 0) {
      writeFileSync(mcpDest, gitFile, 'utf8');
      if (existsSync(mcpDest)) {
        const stats = statSync(mcpDest);
        if (stats.size > 0) {
          console.log('✅ Restored MCP server from git at runtime');
          console.log('   File size:', stats.size, 'bytes');
          process.exit(0);
        }
      }
    }
  } catch (gitError) {
    console.log('⚠️  Could not restore from git (dist):', gitError.message.substring(0, 150));
    console.log('   Error code:', gitError.code);
    console.log('   Error signal:', gitError.signal);
  }

  // Method 4: Try to restore from git assets directory
  console.log('📦 Method 4: Restoring from git assets...');
  try {
    const gitFile = execSync('git show HEAD:assets/mcp-server/index.js', {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: 'pipe',
      maxBuffer: 10 * 1024 * 1024
    });
    
    if (gitFile && gitFile.length > 0) {
      writeFileSync(mcpDest, gitFile, 'utf8');
      if (existsSync(mcpDest)) {
        const stats = statSync(mcpDest);
        if (stats.size > 0) {
          console.log('✅ Restored MCP server from git assets at runtime');
          console.log('   File size:', stats.size, 'bytes');
          process.exit(0);
        }
      }
    }
  } catch (gitError) {
    console.log('⚠️  Could not restore from git (assets):', gitError.message.substring(0, 150));
  }

  // Method 5: Try git checkout (if file exists in working tree)
  console.log('📦 Method 5: Trying git checkout...');
  try {
    execSync('git checkout HEAD -- dist/mcp-server/index.js', {
      cwd: projectRoot,
      stdio: 'pipe',
      timeout: 10000
    });
    
    if (existsSync(mcpDest)) {
      const stats = statSync(mcpDest);
      if (stats.size > 0) {
        console.log('✅ Restored MCP server via git checkout at runtime');
        console.log('   File size:', stats.size, 'bytes');
        process.exit(0);
      }
    }
  } catch (checkoutError) {
    console.log('⚠️  Git checkout failed:', checkoutError.message.substring(0, 100));
  }

  // Method 6: Try to find file in repository
  console.log('📦 Method 6: Searching for file in repository...');
  try {
    const gitFiles = execSync('git ls-files "**/mcp-server/index.js" "dist/mcp-server/index.js" "assets/mcp-server/index.js"', {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: 'pipe'
    }).trim().split('\n').filter(f => f);
    
    console.log('   Found git files:', gitFiles);
    
    if (gitFiles.length > 0) {
      // Try each file
      for (const gitFile of gitFiles) {
        try {
          const fileContent = execSync(`git show HEAD:${gitFile}`, {
            cwd: projectRoot,
            encoding: 'utf8',
            stdio: 'pipe',
            maxBuffer: 10 * 1024 * 1024
          });
          
          if (fileContent && fileContent.length > 0) {
            writeFileSync(mcpDest, fileContent, 'utf8');
            if (existsSync(mcpDest) && statSync(mcpDest).size > 0) {
              console.log('✅ Restored MCP server from git file:', gitFile);
              console.log('   File size:', statSync(mcpDest).size, 'bytes');
              process.exit(0);
            }
          }
        } catch (fileError) {
          console.log('⚠️  Could not restore from:', gitFile, fileError.message.substring(0, 50));
        }
      }
    }
  } catch (searchError) {
    console.log('⚠️  Search failed:', searchError.message.substring(0, 100));
  }

  // All methods failed
  console.error('❌ MCP server not found after all runtime attempts!');
  console.error('');
  console.error('Checked paths:');
  console.error('   - Destination:', mcpDest, existsSync(mcpDest) ? '✅' : '❌');
  console.error('   - Assets source:', assetsSource, existsSync(assetsSource) ? '✅' : '❌');
  console.error('   - Backup:', backupDest, existsSync(backupDest) ? '✅' : '❌');
  console.error('   - Project root:', projectRoot);
  console.error('   - Current directory:', process.cwd());
  console.error('');
  console.error('Debugging info:');
  try {
    const gitRoot = execSync('git rev-parse --show-toplevel', { 
      cwd: projectRoot, 
      encoding: 'utf8',
      stdio: 'pipe' 
    }).trim();
    console.error('   - Git root:', gitRoot);
    
    // Check if git files exist
    try {
      const gitFiles = execSync('git ls-files "**/mcp-server/index.js"', { 
        cwd: projectRoot, 
        encoding: 'utf8',
        stdio: 'pipe' 
      }).trim();
      console.error('   - Git files:', gitFiles || 'none');
    } catch (e) {
      console.error('   - Could not list git files');
    }
    
    // List directory contents
    try {
      const distContents = execSync('ls -la dist/ 2>&1 || echo "dist/ does not exist"', {
        cwd: projectRoot,
        encoding: 'utf8',
        stdio: 'pipe',
        shell: true
      });
      console.error('   - Dist contents:', distContents.substring(0, 500));
    } catch (e) {
      console.error('   - Could not list dist directory');
    }
    
    // List assets contents
    try {
      const assetsContents = execSync('ls -la assets/ 2>&1 || echo "assets/ does not exist"', {
        cwd: projectRoot,
        encoding: 'utf8',
        stdio: 'pipe',
        shell: true
      });
      console.error('   - Assets contents:', assetsContents.substring(0, 500));
    } catch (e) {
      console.error('   - Could not list assets directory');
    }
    
    // List backup contents
    try {
      const backupContents = execSync('ls -la .mcp-server-backup/ 2>&1 || echo "backup does not exist"', {
        cwd: projectRoot,
        encoding: 'utf8',
        stdio: 'pipe',
        shell: true
      });
      console.error('   - Backup contents:', backupContents.substring(0, 500));
    } catch (e) {
      console.error('   - Could not list backup directory');
    }
  } catch (e) {
    console.error('   - Git not available or not in git repo:', e.message.substring(0, 100));
  }
  console.error('');
  console.error('💡 Solutions:');
  console.error('   1. Ensure assets/mcp-server/index.js is committed and pushed to git');
  console.error('   2. Verify file is in remote: git show origin/main:assets/mcp-server/index.js');
  console.error('   3. Check Render build logs for file restoration');
  console.error('   4. Verify Render is using the correct repository and branch');
  console.error('   5. Check if Render is cleaning files between build and runtime');
  
  process.exit(1);
} catch (error) {
  console.error('❌ Error in runtime restore:', error.message);
  console.error('   Stack:', error.stack);
  process.exit(1);
}
