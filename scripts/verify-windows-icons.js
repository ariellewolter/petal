#!/usr/bin/env node
/**
 * Ensure Windows icon assets exist before electron-builder --win.
 * Used by npm run verify:win-icons and CI Windows release builds.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

const REQUIRED_FILES = [
  { rel: 'icon-512.png', minBytes: 1000, hint: 'Windows icon source (512×512)' },
  { rel: 'build/icon.ico', minBytes: 1000, hint: 'Windows .exe / NSIS icon — run npm run build:win:icons' }
];

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exitCode = 1;
}

function main() {
  let ok = true;
  const exit = (msg) => {
    fail(msg);
    ok = false;
  };

  for (const { rel, minBytes, hint } of REQUIRED_FILES) {
    const abs = path.join(root, rel);
    if (!fs.existsSync(abs)) {
      exit(`Missing ${rel} (${hint})`);
      continue;
    }
    const size = fs.statSync(abs).size;
    if (size < minBytes) {
      exit(`${rel} looks invalid (${size} bytes, expected ≥ ${minBytes})`);
    }
  }

  const builderConfig = path.join(root, 'electron-builder.win.config.cjs');
  if (fs.existsSync(builderConfig)) {
    const text = fs.readFileSync(builderConfig, 'utf8');
    if (!text.includes('build/icon.ico')) {
      exit('electron-builder.win.config.cjs must set win.icon to build/icon.ico');
    }
  }

  if (!ok) {
    console.error('\nFix Windows icons: npm run build:win:icons, then commit build/icon.ico');
    process.exit(1);
  }

  console.log('✓ Windows icon assets OK (icon-512.png, build/icon.ico)');
}

main();
