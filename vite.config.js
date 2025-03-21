import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// Helper function to copy files recursively
function copyDir(src, dest) {
  // Create destination directory if it doesn't exist
  if (!existsSync(dest)) {
    mkdirSync(dest, { recursive: true });
  }
  
  // Get all files in source directory
  const files = readdirSync(src);
  
  // Copy each file/directory
  for (const file of files) {
    const srcPath = join(src, file);
    const destPath = join(dest, file);
    
    // Check if it's a directory
    if (statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/runtime/index.ts'),
      name: 'JSONSchemaFormRuntime',
      fileName: (format) => `runtime.${format}.js`
    },
    outDir: 'dist',
    sourcemap: true,
    // Don't minify for better debugging
    minify: false,
    // Custom rollup options
    rollupOptions: {
      output: {
        // Ensure exports are preserved
        exports: 'named'
      }
    }
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  // Hook into the build process
  plugins: [
    {
      name: 'copy-html-and-assets',
      closeBundle() {
        // Copy the HTML files
        console.log('Copying HTML and asset files to dist...');
        
        // Copy runtime-demo.html
        try {
          copyFileSync('runtime-demo.html', 'dist/runtime-demo.html');
          console.log('Copied runtime-demo.html');
        } catch (err) {
          console.error('Error copying runtime-demo.html:', err);
        }
        
        // Copy template-playground.html if it exists
        try {
          if (existsSync('template-playground.html')) {
            copyFileSync('template-playground.html', 'dist/template-playground.html');
            console.log('Copied template-playground.html');
          }
        } catch (err) {
          console.error('Error copying template-playground.html:', err);
        }
        
        // Copy public directory contents
        try {
          if (existsSync('public')) {
            // Copy generated-templates
            if (existsSync('public/generated-templates')) {
              copyDir('public/generated-templates', 'dist/generated-templates');
              console.log('Copied generated-templates directory');
            }
            
            // Copy test-schemas
            if (existsSync('public/test-schemas')) {
              copyDir('public/test-schemas', 'dist/test-schemas');
              console.log('Copied test-schemas directory');
            }
          }
        } catch (err) {
          console.error('Error copying public directory:', err);
        }
        
        console.log('Copy completed');
      }
    }
  ]
}); 