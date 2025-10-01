const fs = require('fs-extra');
const archiver = require('archiver');
const path = require('path');

const SOURCE_DIR = './src';
const BUILD_DIR = './dist';
const ZIP_NAME = 'email-security-scanner.zip';

async function build() {
  console.log('🔨 Building extension...\n');

  // Clean build directory
  console.log('Cleaning build directory...');
  await fs.remove(BUILD_DIR);
  await fs.ensureDir(BUILD_DIR);

  // Copy files
  console.log('Copying files...');
  
  const filesToCopy = [
    'manifest.json',
    'background.js',
    'content-gmail.js',
    'content-outlook.js',
    'popup.html',
    'popup.js',
    'icons'
  ];

  for (const file of filesToCopy) {
    const sourcePath = path.join(SOURCE_DIR, file);
    const destPath = path.join(BUILD_DIR, file);
    
    if (await fs.pathExists(sourcePath)) {
      await fs.copy(sourcePath, destPath);
      console.log(`  ✓ ${file}`);
    } else {
      console.log(`  ⚠ ${file} not found, skipping`);
    }
  }

  // Create icons directory if it doesn't exist
  const iconsDir = path.join(BUILD_DIR, 'icons');
  await fs.ensureDir(iconsDir);

  // Create placeholder icons if they don't exist
  console.log('\nGenerating placeholder icons...');
  const iconSizes = [16, 48, 128];
  for (const size of iconSizes) {
    const iconPath = path.join(iconsDir, `icon${size}.png`);
    if (!await fs.pathExists(iconPath)) {
      // Create a simple colored square as placeholder
      console.log(`  ⚠ icon${size}.png not found - you'll need to add real icons`);
    }
  }

  console.log('\n✅ Build complete!');
  console.log(`📦 Extension built in: ${BUILD_DIR}`);
  
  // Create zip file
  await createZip();
}

async function createZip() {
  console.log('\n📦 Creating ZIP archive...');

  const output = fs.createWriteStream(ZIP_NAME);
  const archive = archiver('zip', { zlib: { level: 9 } });

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      console.log(`✅ ZIP created: ${ZIP_NAME} (${archive.pointer()} bytes)`);
      console.log('\n🎉 Ready for Chrome Web Store submission!');
      resolve();
    });

    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(BUILD_DIR, false);
    archive.finalize();
  });
}

build().catch(console.error);