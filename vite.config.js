import { defineConfig } from 'vite';
import { resolve } from 'path';
import * as sass from 'sass';
import sassOptions from './sassOptions.js';
import { copyFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname } from 'path';

// Function to copy directory recursively
function copyDir(src, dest) {
  // Check if source directory exists
  if (!existsSync(src)) {
    console.error(`Source directory does not exist: ${src}`);
    return;
  }

  try {
    // Create destination directory if it doesn't exist
    if (!existsSync(dest)) {
      mkdirSync(dest, { recursive: true });
    }

    // Read source directory
    const entries = readdirSync(src, { withFileTypes: true });

    // Copy each entry recursively
    for (const entry of entries) {
      const srcPath = join(src, entry.name);
      const destPath = join(dest, entry.name);

      if (entry.isDirectory()) {
        copyDir(srcPath, destPath);
      } else {
        try {
          copyFileSync(srcPath, destPath);
        } catch (error) {
          mkdirSync(dirname(destPath), { recursive: true });
          copyFileSync(srcPath, destPath);
        }
      }
    }
  } catch (error) {
    console.error(`Error copying directory: ${error.message}`);
  }
}

export default defineConfig({
  root: 'src',
  base: './', // Use relative paths instead of absolute paths
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    // Assets handling
    assetsInlineLimit: 4096, // Only inline assets smaller than 4kb
  },
  server: {
    open: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        implementation: sass,
        ...sassOptions
      },
    },
  },
  // Custom plugin to copy assets folder
  plugins: [
    {
      name: 'copy-assets-plugin',
      apply: 'build',
      enforce: 'post',
      closeBundle: async () => {
        console.log('Copying assets to build directory...');
        
        // Copy assets from src/assets to dist/assets
        const srcAssetsDir = resolve(__dirname, 'src/assets');
        const destAssetsDir = resolve(__dirname, 'dist/assets');
        
        try {
          copyDir(srcAssetsDir, destAssetsDir);
          console.log('✓ Assets copied successfully from src/assets to dist/assets');
        } catch (error) {
          console.error(`Error copying assets: ${error.message}`);
        }
      }
    }
  ]
});