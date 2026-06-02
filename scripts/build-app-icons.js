#!/usr/bin/env node
/**
 * Build macOS .icns (and optional Windows .ico) from icon-512.png for electron-builder.
 * Run: npm run build:icons
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const srcPng = path.join(root, 'icon-512.png');
const buildDir = path.join(root, 'build');
const iconsetDir = path.join(buildDir, 'icon.iconset');
const icnsOut = path.join(buildDir, 'icon.icns');

const ICONSET_FILES = [
  [16, 'icon_16x16.png'],
  [32, 'icon_16x16@2x.png'],
  [32, 'icon_32x32.png'],
  [64, 'icon_32x32@2x.png'],
  [128, 'icon_128x128.png'],
  [256, 'icon_128x128@2x.png'],
  [256, 'icon_256x256.png'],
  [512, 'icon_256x256@2x.png'],
  [512, 'icon_512x512.png'],
  [1024, 'icon_512x512@2x.png']
];

function run(cmd) {
  execSync(cmd, { stdio: 'inherit', cwd: root });
}

function main() {
  if (!fs.existsSync(srcPng)) {
    console.error('Missing icon-512.png — run setup-icon.js or add your Petal icon first.');
    process.exit(1);
  }

  try {
    execSync('which sips', { stdio: 'ignore' });
    execSync('which iconutil', { stdio: 'ignore' });
  } catch {
    console.error('build-app-icons requires macOS tools: sips and iconutil');
    process.exit(1);
  }

  fs.mkdirSync(buildDir, { recursive: true });
  if (fs.existsSync(iconsetDir)) {
    fs.rmSync(iconsetDir, { recursive: true, force: true });
  }
  fs.mkdirSync(iconsetDir, { recursive: true });

  console.log('Building icon.iconset from icon-512.png…');
  for (const [size, name] of ICONSET_FILES) {
    const out = path.join(iconsetDir, name);
    run(
      `sips -z ${size} ${size} "${srcPng}" --out "${out}" -s format png`
    );
  }

  if (fs.existsSync(icnsOut)) fs.unlinkSync(icnsOut);
  run(`iconutil -c icns "${iconsetDir}" -o "${icnsOut}"`);
  fs.rmSync(iconsetDir, { recursive: true, force: true });

  const icon192 = path.join(root, 'icon-192.png');
  if (!fs.existsSync(icon192)) {
    console.log('Creating icon-192.png from icon-512.png…');
    run(`sips -z 192 192 "${srcPng}" --out "${icon192}" -s format png`);
  }

  console.log(`\n✓ ${icnsOut}`);
  console.log('Commit build/icon.icns, icon-192.png, and icon-512.png so releases package the Petal icon.\n');
}

main();
