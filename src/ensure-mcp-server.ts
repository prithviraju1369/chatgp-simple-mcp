/**
 * Utility function to ensure MCP server file exists
 * This runs when the file is needed, not just at startup
 */

import { existsSync, mkdirSync, copyFileSync, writeFileSync, statSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execSync } from 'node:child_process';

export function ensureMcpServer(projectRoot: string, mcpDest: string): void {
  // If file already exists, return
  if (existsSync(mcpDest)) {
    const stats = statSync(mcpDest);
    if (stats.size > 0) {
      return; // File exists and is not empty
    }
  }

  console.log('⚠️  MCP server not found, attempting to restore...');
  console.log('   Destination:', mcpDest);
  console.log('   Project root:', projectRoot);

  // Create directory if it doesn't exist
  const distDir = dirname(mcpDest);
  if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true });
    console.log('✅ Created directory:', distDir);
  }

  // Method 1: Try to copy from assets directory (committed to git)
  const assetsSource = join(projectRoot, 'assets', 'mcp-server', 'index.js');
  console.log('📦 Method 1: Copying from assets directory...');
  console.log('   Assets source:', assetsSource);
  if (existsSync(assetsSource)) {
    try {
      const stats = statSync(assetsSource);
      console.log('   Assets file exists, size:', stats.size, 'bytes');
      if (stats.size > 0) {
        copyFileSync(assetsSource, mcpDest);
        if (existsSync(mcpDest) && statSync(mcpDest).size > 0) {
          console.log('✅ Restored MCP server from assets directory');
          console.log('   File size:', stats.size, 'bytes');
          return;
        } else {
          console.log('⚠️  Copy failed - file not created or empty');
        }
      } else {
        console.log('⚠️  Assets file is empty');
      }
    } catch (copyError) {
      console.log('⚠️  Copy from assets failed:', (copyError as Error).message);
      console.log('   Error stack:', (copyError as Error).stack?.substring(0, 200));
    }
  } else {
    console.log('⚠️  Assets source not found:', assetsSource);
    // List assets directory to see what's there
    try {
      const assetsDir = join(projectRoot, 'assets');
      if (existsSync(assetsDir)) {
        try {
          const assetsContents = readdirSync(assetsDir, { recursive: true });
          console.log('   Assets directory exists, contents:', assetsContents.slice(0, 10));
        } catch (readError) {
          console.log('   Could not read assets directory:', (readError as Error).message.substring(0, 100));
        }
      } else {
        console.log('   Assets directory does not exist:', assetsDir);
      }
    } catch (e) {
      console.log('   Could not list assets directory:', (e as Error).message.substring(0, 100));
    }
  }

  // Method 2: Try to restore from git assets directory
  try {
    const gitFile = execSync('git show HEAD:assets/mcp-server/index.js', {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: 'pipe',
      maxBuffer: 10 * 1024 * 1024
    });
    
    if (gitFile && gitFile.length > 0) {
      writeFileSync(mcpDest, gitFile, 'utf8');
      if (existsSync(mcpDest) && statSync(mcpDest).size > 0) {
        console.log('✅ Restored MCP server from git assets');
        console.log('   File size:', statSync(mcpDest).size, 'bytes');
        return;
      }
    }
  } catch (gitError) {
    console.log('⚠️  Could not restore from git assets:', (gitError as Error).message.substring(0, 100));
  }

  // Method 3: Try to restore from git dist directory
  try {
    const gitFile = execSync('git show HEAD:dist/mcp-server/index.js', {
      cwd: projectRoot,
      encoding: 'utf8',
      stdio: 'pipe',
      maxBuffer: 10 * 1024 * 1024
    });
    
    if (gitFile && gitFile.length > 0) {
      writeFileSync(mcpDest, gitFile, 'utf8');
      if (existsSync(mcpDest) && statSync(mcpDest).size > 0) {
        console.log('✅ Restored MCP server from git dist');
        console.log('   File size:', statSync(mcpDest).size, 'bytes');
        return;
      }
    }
  } catch (gitError) {
    console.log('⚠️  Could not restore from git dist:', (gitError as Error).message.substring(0, 100));
  }

  // Method 4: Try to restore from backup
  const backupDest = join(projectRoot, '.mcp-server-backup', 'index.js');
  if (existsSync(backupDest)) {
    try {
      const stats = statSync(backupDest);
      if (stats.size > 0) {
        copyFileSync(backupDest, mcpDest);
        if (existsSync(mcpDest) && statSync(mcpDest).size > 0) {
          console.log('✅ Restored MCP server from backup');
          console.log('   File size:', stats.size, 'bytes');
          return;
        }
      }
    } catch (backupError) {
      console.log('⚠️  Backup restore failed:', (backupError as Error).message);
    }
  }

  // Method 5: Try git checkout
  try {
    execSync('git checkout HEAD -- dist/mcp-server/index.js', {
      cwd: projectRoot,
      stdio: 'pipe',
      timeout: 10000
    });
    
    if (existsSync(mcpDest) && statSync(mcpDest).size > 0) {
      console.log('✅ Restored MCP server via git checkout');
      return;
    }
  } catch (checkoutError) {
    console.log('⚠️  Git checkout failed:', (checkoutError as Error).message.substring(0, 100));
  }

  // All methods failed - file still doesn't exist
  console.error('❌ MCP server not found after all restore attempts!');
  console.error('   Checked paths:');
  console.error('   - Destination:', mcpDest, existsSync(mcpDest) ? '✅' : '❌');
  console.error('   - Assets source:', assetsSource, existsSync(assetsSource) ? '✅' : '❌');
  console.error('   - Backup:', backupDest, existsSync(backupDest) ? '✅' : '❌');
}

