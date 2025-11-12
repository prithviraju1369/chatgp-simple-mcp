#!/usr/bin/env node
/**
 * Script to ensure MCP server is available in dist/mcp-server/index.js
 * This runs after TypeScript compilation to restore the pre-bundled MCP server
 * MUST work on Render - uses multiple fallback methods
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
const mcpSource = join(projectRoot, '..', 'mcp-local-main', 'dist', 'index.js');

console.log('🔍 Ensuring MCP server is available...');
console.log('   Destination:', mcpDest);
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

  // Check if file already exists (should be from git checkout)
  if (existsSync(mcpDest)) {
    const stats = statSync(mcpDest);
    console.log('✅ MCP server already exists at:', mcpDest);
    console.log('   File size:', stats.size, 'bytes');
    console.log('   File is readable:', true);
    
    // Verify file is not empty
    if (stats.size > 0) {
      console.log('✅ File is valid (non-empty)');
      process.exit(0);
    } else {
      console.log('⚠️  File exists but is empty, attempting to restore...');
    }
  }

  console.log('⚠️  MCP server not found, attempting to restore...');

  // Method 1: Try to restore from git HEAD (file should be in repository)
  console.log('📦 Method 1: Restoring from git HEAD...');
  try {
    // Try git show to get file from HEAD - this works even if file was removed from working tree
    const gitFile = execSync('git show HEAD:dist/mcp-server/index.js', {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: 'pipe',
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });
    
    if (gitFile && gitFile.length > 0) {
      // Write file to destination
      writeFileSync(mcpDest, gitFile, 'utf8');
      
      // Verify file was written
      if (existsSync(mcpDest)) {
        const stats = statSync(mcpDest);
        if (stats.size > 0) {
          console.log('✅ Restored MCP server from git HEAD');
          console.log('   File size:', stats.size, 'bytes');
          process.exit(0);
        } else {
          console.log('⚠️  File written but is empty');
        }
      } else {
        console.log('⚠️  File write failed - file does not exist after write');
      }
    } else {
      console.log('⚠️  Git show returned empty content');
    }
  } catch (gitError) {
    console.log('⚠️  Could not restore from git HEAD:', gitError.message.substring(0, 150));
    console.log('   Error code:', gitError.code);
    console.log('   Error signal:', gitError.signal);
  }

  // Method 2: Try git checkout (restore from index)
  console.log('📦 Method 2: Trying git checkout...');
  try {
    execSync('git checkout HEAD -- dist/mcp-server/index.js', {
      cwd: projectRoot,
      stdio: 'pipe',
      timeout: 10000
    });
    
    if (existsSync(mcpDest)) {
      const stats = statSync(mcpDest);
      if (stats.size > 0) {
        console.log('✅ Restored MCP server via git checkout');
        console.log('   File size:', stats.size, 'bytes');
        process.exit(0);
      }
    }
  } catch (checkoutError) {
    console.log('⚠️  Git checkout failed:', checkoutError.message.substring(0, 100));
  }

  // Method 3: Try to restore from current branch
  console.log('📦 Method 3: Trying to restore from current branch...');
  try {
    // Get current branch or commit
    const branch = execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: 'pipe'
    }).trim();
    
    console.log('   Current branch:', branch);
    
    // Try to get file from current branch
    const gitFile = execSync(`git show ${branch}:dist/mcp-server/index.js`, {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: 'pipe',
      maxBuffer: 10 * 1024 * 1024
    });
    
    if (gitFile && gitFile.length > 0) {
      writeFileSync(mcpDest, gitFile, 'utf8');
      if (existsSync(mcpDest) && statSync(mcpDest).size > 0) {
        console.log('✅ Restored MCP server from branch:', branch);
        console.log('   File size:', statSync(mcpDest).size, 'bytes');
        process.exit(0);
      }
    }
  } catch (branchError) {
    console.log('⚠️  Could not restore from branch:', branchError.message.substring(0, 100));
  }

  // Method 4: Try to copy from source (mcp-local-main) - for local development
  console.log('📦 Method 4: Copying from source...');
  if (existsSync(mcpSource)) {
    try {
      copyFileSync(mcpSource, mcpDest);
      if (existsSync(mcpDest)) {
        const stats = statSync(mcpDest);
        if (stats.size > 0) {
          console.log('✅ Copied MCP server from source');
          console.log('   File size:', stats.size, 'bytes');
          process.exit(0);
        }
      }
    } catch (copyError) {
      console.log('⚠️  Copy failed:', copyError.message);
    }
  } else {
    console.log('⚠️  Source not found:', mcpSource);
  }

  // Method 5: Try to find file in any location
  console.log('📦 Method 5: Searching for file in repository...');
  try {
    // List all files in git that match the pattern
    const gitFiles = execSync('git ls-files "**/mcp-server/index.js" "**/dist/mcp-server/index.js"', {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: 'pipe'
    }).trim().split('\n').filter(f => f);
    
    console.log('   Found git files:', gitFiles);
    
    if (gitFiles.length > 0) {
      // Try to get the first file
      const gitFile = execSync(`git show HEAD:${gitFiles[0]}`, {
        cwd: projectRoot,
        encoding: 'utf8',
        stdio: 'pipe',
        maxBuffer: 10 * 1024 * 1024
      });
      
      if (gitFile && gitFile.length > 0) {
        writeFileSync(mcpDest, gitFile, 'utf8');
        if (existsSync(mcpDest) && statSync(mcpDest).size > 0) {
          console.log('✅ Restored MCP server from git file:', gitFiles[0]);
          console.log('   File size:', statSync(mcpDest).size, 'bytes');
          process.exit(0);
        }
      }
    }
  } catch (searchError) {
    console.log('⚠️  Search failed:', searchError.message.substring(0, 100));
  }

  // All methods failed - provide detailed debugging info
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
    const gitRoot = execSync('git rev-parse --show-toplevel', { 
      cwd: projectRoot, 
      encoding: 'utf8',
      stdio: 'pipe' 
    }).trim();
    console.error('   - Git root:', gitRoot);
    
    const gitFiles = execSync('git ls-files dist/mcp-server/', { 
      cwd: projectRoot, 
      encoding: 'utf8',
      stdio: 'pipe' 
    }).trim();
    console.error('   - Git files:', gitFiles || 'none');
    
    const gitStatus = execSync('git status --porcelain dist/mcp-server/', { 
      cwd: projectRoot, 
      encoding: 'utf8',
      stdio: 'pipe' 
    }).trim();
    console.error('   - Git status:', gitStatus || 'clean');
    
    // Check if file exists in HEAD
    try {
      const headFile = execSync('git ls-tree HEAD dist/mcp-server/index.js', {
        cwd: projectRoot,
        encoding: 'utf8',
        stdio: 'pipe'
      }).trim();
      console.error('   - File in HEAD:', headFile || 'not found');
    } catch (e) {
      console.error('   - File in HEAD: not found');
    }
    
    // List dist directory
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
  } catch (e) {
    console.error('   - Git not available or not in git repo:', e.message.substring(0, 100));
  }
  console.error('');
  console.error('💡 Solutions:');
  console.error('   1. Ensure dist/mcp-server/index.js is committed and pushed to git');
  console.error('   2. Verify file is in remote: git ls-remote --heads origin main');
  console.error('   3. Check Render build logs for this script output');
  console.error('   4. Verify Render is using the correct repository and branch');
  console.error('   5. Ensure file is not being removed after build');
  
  process.exit(1);
} catch (error) {
  console.error('❌ Error ensuring MCP server:', error.message);
  console.error('   Stack:', error.stack);
  process.exit(1);
}
