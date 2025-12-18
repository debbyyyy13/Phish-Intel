const fs = require('fs-extra');
const archiver = require('archiver');
const path = require('path');

const SOURCE_DIR = './src';
const BUILD_DIR = './dist';
const ZIP_NAME = 'phishguard-extension.zip';

async function build() {
  console.log('🔨 Building PhishGuard extension...\n');

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
    'content-yahoo.js',
    'popup.html',
    'popup.js',
    'options.html',
    'options.js'
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

  // Copy utils directory if it exists
  const utilsSource = path.join(SOURCE_DIR, 'utils');
  const utilsDest = path.join(BUILD_DIR, 'utils');
  if (await fs.pathExists(utilsSource)) {
    await fs.copy(utilsSource, utilsDest);
    console.log('  ✓ utils/');
  } else {
    // Create utils directory and common.js if it doesn't exist
    await fs.ensureDir(utilsDest);
    console.log('  ⚠ utils/ not found, creating...');
    
    // Check if we need to create common.js from the artifacts
    const commonJsPath = path.join(utilsDest, 'common.js');
    if (!await fs.pathExists(commonJsPath)) {
      // Create a minimal common.js
      const minimalCommon = `// Common utilities placeholder
console.log('[PhishGuard] Utils loaded');
`;
      await fs.writeFile(commonJsPath, minimalCommon);
      console.log('  ✓ Created utils/common.js');
    }
  }

  // Copy or create icons directory
  const iconsSource = path.join(SOURCE_DIR, 'icons');
  const iconsDest = path.join(BUILD_DIR, 'icons');
  
  if (await fs.pathExists(iconsSource)) {
    await fs.copy(iconsSource, iconsDest);
    console.log('  ✓ icons/');
  } else {
    await fs.ensureDir(iconsDest);
    console.log('  ⚠ icons/ not found, creating placeholder icons...');
    
    // Create placeholder icons if they don't exist
    const iconSizes = [16, 48, 128];
    for (const size of iconSizes) {
      const iconPath = path.join(iconsDest, `icon${size}.png`);
      if (!await fs.pathExists(iconPath)) {
        console.log(`  ⚠ icon${size}.png not found - you'll need to add real icons`);
      }
    }
  }

  // Validate manifest.json
  console.log('\nValidating manifest.json...');
  try {
    const manifestPath = path.join(BUILD_DIR, 'manifest.json');
    const manifest = await fs.readJson(manifestPath);
    
    // Check required fields
    const requiredFields = ['manifest_version', 'name', 'version'];
    const missingFields = requiredFields.filter(field => !manifest[field]);
    
    if (missingFields.length > 0) {
      console.error(`  ❌ Missing required fields: ${missingFields.join(', ')}`);
      throw new Error('Invalid manifest.json');
    }
    
    if (manifest.manifest_version !== 3) {
      console.error('  ❌ Manifest version must be 3');
      throw new Error('Invalid manifest version');
    }
    
    console.log('  ✓ Manifest is valid');
  } catch (error) {
    console.error('  ❌ Manifest validation failed:', error.message);
    throw error;
  }

  console.log('\n✅ Build complete!');
  console.log(`📦 Extension built in: ${BUILD_DIR}`);
  
  // Create zip file
  await createZip();
  
  // Print instructions
  printInstructions();
}

async function createZip() {
  console.log('\n📦 Creating ZIP archive...');

  const output = fs.createWriteStream(ZIP_NAME);
  const archive = archiver('zip', { zlib: { level: 9 } });

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      console.log(`✅ ZIP created: ${ZIP_NAME} (${archive.pointer()} bytes)`);
      resolve();
    });

    archive.on('error', reject);
    archive.pipe(output);
    archive.directory(BUILD_DIR, false);
    archive.finalize();
  });
}

function printInstructions() {
  console.log('\n' + '='.repeat(60));
  console.log('📝 INSTALLATION INSTRUCTIONS');
  console.log('='.repeat(60));
  console.log('\n1. Open Chrome and go to: chrome://extensions');
  console.log('2. Enable "Developer mode" (toggle in top-right)');
  console.log('3. Click "Load unpacked"');
  console.log('4. Select the "dist" folder');
  console.log('5. Extension should now be loaded!');
  console.log('\n💡 TIP: Click the extension icon to configure settings');
  console.log('🎉 Ready for testing!\n');
}

build().catch(error => {
  console.error('\n❌ Build failed:', error);
  process.exit(1);
});