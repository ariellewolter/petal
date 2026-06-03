#!/usr/bin/env node
/**
 * Copy web assets into www/ for Capacitor iOS builds.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const www = path.join(root, 'www');

const FILES = [
  'tasklist.html',
  'storage.js',
  'manifest.json',
  'service-worker.js',
  'icon-192.png',
  'icon-512.png',
];

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      if (name === 'node_modules' || name === '.git') continue;
      copyRecursive(path.join(src, name), path.join(dest, name));
    }
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

if (fs.existsSync(www)) {
  fs.rmSync(www, { recursive: true, force: true });
}
fs.mkdirSync(www, { recursive: true });

for (const file of FILES) {
  const src = path.join(root, file);
  if (!fs.existsSync(src)) {
    console.warn(`skip missing: ${file}`);
    continue;
  }
  copyRecursive(src, path.join(www, file));
}

copyRecursive(path.join(root, 'src'), path.join(www, 'src'));

console.log('✅ www/ prepared for Capacitor');
