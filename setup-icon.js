#!/usr/bin/env node
// Script to set up the Petal icon for the app
// Usage: node setup-icon.js [path-to-icon-image.png]

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const iconSizes = [192, 512];

function checkForImageMagick() {
  try {
    execSync('which convert', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function checkForSips() {
  try {
    execSync('which sips', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function resizeWithSips(inputPath, outputPath, size) {
  try {
    execSync(`sips -z ${size} ${size} "${inputPath}" --out "${outputPath}"`, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`Error resizing with sips:`, error.message);
    return false;
  }
}

function resizeWithImageMagick(inputPath, outputPath, size) {
  try {
    execSync(`convert "${inputPath}" -resize ${size}x${size} -background none -gravity center -extent ${size}x${size} "${outputPath}"`, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`Error resizing with ImageMagick:`, error.message);
    return false;
  }
}

function main() {
  const iconImagePath = process.argv[2];
  
  if (!iconImagePath) {
    console.log(`
🎨 Petal Icon Setup

Usage: node setup-icon.js [path-to-icon-image.png]

This script will create icon-192.png and icon-512.png from your Petal icon image.

Options:
1. If you have the Petal icon image file, run:
   node setup-icon.js /path/to/your/petal-icon.png

2. Or use the icon generator HTML file:
   Open icon-generator.html in your browser and upload your icon image there.

3. Or manually:
   - Save your icon as icon-512.png (512x512 pixels)
   - Create icon-192.png (192x192 pixels) by resizing icon-512.png
   - Place both files in the app root directory
`);
    process.exit(1);
  }

  if (!fs.existsSync(iconImagePath)) {
    console.error(`❌ Error: Image file not found: ${iconImagePath}`);
    process.exit(1);
  }

  console.log(`\n🎨 Setting up Petal icons from: ${iconImagePath}\n`);

  const hasSips = checkForSips();
  const hasImageMagick = checkForImageMagick();

  if (!hasSips && !hasImageMagick) {
    console.error(`
❌ Error: No image resizing tool found.

Please install one of the following:
- macOS: sips is built-in (should work automatically)
- ImageMagick: brew install imagemagick

Or use the icon-generator.html file in your browser instead.
`);
    process.exit(1);
  }

  const tool = hasSips ? 'sips' : 'ImageMagick';
  console.log(`Using ${tool} to resize images...\n`);

  let success = true;
  for (const size of iconSizes) {
    const outputPath = path.join(__dirname, `icon-${size}.png`);
    console.log(`Creating icon-${size}.png...`);
    
    let resized = false;
    if (hasSips) {
      resized = resizeWithSips(iconImagePath, outputPath, size);
    } else if (hasImageMagick) {
      resized = resizeWithImageMagick(iconImagePath, outputPath, size);
    }

    if (resized && fs.existsSync(outputPath)) {
      console.log(`✓ Created ${outputPath}\n`);
    } else {
      console.error(`✗ Failed to create ${outputPath}\n`);
      success = false;
    }
  }

  if (success) {
    console.log(`
✅ Success! Icon files created:
   - icon-192.png
   - icon-512.png

The app is now configured to use these icons.

Next, build the macOS app icon for releases:
  npm run build:icons

Then commit build/icon.icns so GitHub releases show the Petal icon in the Dock.
`);
    try {
      require('child_process').execSync('node scripts/build-app-icons.js', {
        stdio: 'inherit',
        cwd: __dirname
      });
    } catch {
      console.log('(Skipped build/icon.icns — run npm run build:icons on macOS before a release.)');
    }
  } else {
    console.error(`
❌ Some errors occurred. Please check the output above.
You can also use icon-generator.html in your browser as an alternative.
`);
    process.exit(1);
  }
}

main();
