#!/usr/bin/env node
/**
 * Ensure PNG + macOS icons exist and are listed for electron-builder packaging.
 * Used by npm run verify:icons and CI before release builds.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

const REQUIRED_FILES = [
  { rel: 'icon-192.png', minBytes: 500, hint: 'UI / PWA icon (192×192)' },
  { rel: 'icon-512.png', minBytes: 1000, hint: 'Windows icon source + macOS .icns input (512×512)' },
  { rel: 'build/icon.icns', minBytes: 5000, hint: 'macOS .app / DMG icon — run npm run build:icons' },
  { rel: 'manifest.json', minBytes: 50, hint: 'Web app manifest' }
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

  const manifestPath = path.join(root, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    let manifest;
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (e) {
      exit(`manifest.json is not valid JSON: ${e.message}`);
    }
    if (manifest) {
      for (const icon of manifest.icons || []) {
        const src = icon?.src;
        if (!src) continue;
        const abs = path.join(root, src.replace(/^\.\//, ''));
        if (!fs.existsSync(abs)) {
          exit(`manifest.json references missing file: ${src}`);
        }
      }
    }
  }

  const builderConfig = path.join(root, 'electron-builder.config.cjs');
  if (fs.existsSync(builderConfig)) {
    const text = fs.readFileSync(builderConfig, 'utf8');
    for (const rel of ['icon-192.png', 'icon-512.png', 'manifest.json']) {
      if (!text.includes(`"${rel}"`) && !text.includes(`'${rel}'`)) {
        exit(`electron-builder.config.cjs must list "${rel}" in files[]`);
      }
    }
  }

  if (!ok) {
    console.error('\nFix icons: add PNGs to repo root, then on macOS run npm run build:icons and commit build/icon.icns');
    process.exit(1);
  }

  console.log('✓ Release icon assets OK (icon-192.png, icon-512.png, build/icon.icns, manifest.json)');
}

main();
