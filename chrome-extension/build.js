const fs = require('fs');
const path = require('path');

// Simple build script: copy HTML and inline TypeScript as JavaScript
// For production, use a proper bundler like Vite or Webpack

const srcDir = path.join(__dirname, 'src');
const distDir = path.join(__dirname, 'dist');

// Create dist directory
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Copy HTML files
function copyHtmlFiles() {
  const files = ['popup/popup.html'];
  
  files.forEach(file => {
    const srcPath = path.join(srcDir, file);
    const distPath = path.join(distDir, file);
    const distDirPath = path.dirname(distPath);
    
    if (!fs.existsSync(distDirPath)) {
      fs.mkdirSync(distDirPath, { recursive: true });
    }
    
    if (fs.existsSync(srcPath)) {
      fs.copyFileSync(srcPath, distPath);
      console.log(`Copied ${file}`);
    }
  });
}

// Inline TypeScript to JavaScript (simplified)
function inlineTypeScript() {
  const files = [
    { src: 'background/background.ts', dist: 'background.js' },
    { src: 'content/content.ts', dist: 'content.js' },
    { src: 'popup/popup.ts', dist: 'popup.js' }
  ];
  
  files.forEach(file => {
    const srcPath = path.join(srcDir, file.src);
    const distPath = path.join(distDir, file.dist);
    const distDirPath = path.dirname(distPath);
    
    if (!fs.existsSync(distDirPath)) {
      fs.mkdirSync(distDirPath, { recursive: true });
    }
    
    if (fs.existsSync(srcPath)) {
      let content = fs.readFileSync(srcPath, 'utf8');
      
      // Very basic TypeScript to JavaScript conversion
      // In production, use tsc or a bundler
      content = content
        .replace(/interface\s+\w+\s*{[^}]+}/g, '') // Remove interfaces
        .replace(/:\s*\w+(\[\])?/g, '') // Remove type annotations
        .replace(/<any>/g, '') // Remove type parameters
        .replace(/as\s+\w+/g, '') // Remove type assertions
        .replace(/async\s+/g, 'async ') // Keep async
        .replace(/await\s+/g, 'await ') // Keep await
        .replace(/let\s+/g, 'let ') // Keep let
        .replace(/const\s+/g, 'const ') // Keep const
        .replace(/function\s+\w+\([^)]*\)\s*{/g, (match) => {
          return match; // Keep function syntax
        });
      
      fs.writeFileSync(distPath, content);
      console.log(`Converted ${file.src} to ${file.dist}`);
    }
  });
}

// Copy manifest.json
function copyManifest() {
  const srcPath = path.join(__dirname, 'manifest.json');
  const distPath = path.join(distDir, 'manifest.json');
  
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, distPath);
    console.log('Copied manifest.json');
  }
}

// Create simple icon files (SVG converted to PNG placeholder)
function createIcons() {
  const iconsDir = path.join(distDir, 'icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }
  
  // Create simple SVG icons and save as placeholder
  const sizes = [16, 32, 48, 128];
  
  sizes.forEach(size => {
    const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#4F46E5"/>
      <text x="50%" y="50%" font-size="${size * 0.5}" fill="white" text-anchor="middle" dy="${size * 0.15}" font-weight="bold" font-family="Arial">JA</text>
    </svg>`;
    
    const svgPath = path.join(iconsDir, `icon${size}.svg`);
    fs.writeFileSync(svgPath, svg);
    console.log(`Created icon${size}.svg (use a tool to convert to PNG)`);
  });
}

console.log('Building Chrome extension...');
copyHtmlFiles();
inlineTypeScript();
copyManifest();
createIcons();
console.log('Build complete! Files are in dist/ directory');
console.log('Note: For production, use tsc or a bundler to properly compile TypeScript');
