#!/usr/bin/env node
/**
 * Build Windows .ico from icon-512.png for electron-builder (cross-platform).
 * Run: npm run build:win:icons
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const srcPng = path.join(root, 'icon-512.png');
const buildDir = path.join(root, 'build');
const icoOut = path.join(buildDir, 'icon.ico');

async function main() {
  if (!fs.existsSync(srcPng)) {
    console.error('Missing icon-512.png — add your Petal icon to the repo root first.');
    process.exit(1);
  }

  fs.mkdirSync(buildDir, { recursive: true });

  const pngToIco = (await import('png-to-ico')).default;
  const ico = await pngToIco(srcPng);
  fs.writeFileSync(icoOut, ico);

  console.log(`✓ ${icoOut}`);
  console.log('Commit build/icon.ico so Windows release builds use the Petal icon.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
