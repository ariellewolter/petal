#!/usr/bin/env node
// ═══════════════════════ HOOKUPS AUDIT SCRIPT ═══════════════════════
// Static analysis to verify all hookups before release

const fs = require('fs');
const path = require('path');

const FAILURES = [];
const WARNINGS = [];
const HTML_ENTRY_CANDIDATES = ['tasklist.html', 'tasklist (1).html'];

// Colors for terminal output
const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN = '\x1b[32m';
const BLUE = '\x1b[34m';

function log(message, color = RESET) {
  console.log(`${color}${message}${RESET}`);
}

function fail(check, message, file, line = null) {
  const failure = { check, message, file, line };
  FAILURES.push(failure);
  log(`❌ FAIL: ${check}`, RED);
  log(`   ${message}`, RED);
  if (file) log(`   File: ${file}${line ? `:${line}` : ''}`, RED);
}

function warn(check, message, file, line = null) {
  const warning = { check, message, file, line };
  WARNINGS.push(warning);
  log(`⚠️  WARN: ${check}`, YELLOW);
  log(`   ${message}`, YELLOW);
  if (file) log(`   File: ${file}${line ? `:${line}` : ''}`, YELLOW);
}

function pass(check) {
  log(`✅ PASS: ${check}`, GREEN);
}

// Read file and return lines
function readFileLines(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.split('\n');
  } catch (e) {
    return [];
  }
}

// Find all files matching pattern
function findFiles(dir, pattern, exclude = []) {
  const files = [];
  function walk(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relPath = path.relative(process.cwd(), fullPath);
      
      // Skip excluded paths
      if (exclude.some(ex => relPath.includes(ex))) continue;
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        walk(fullPath);
      } else if (entry.isFile() && pattern.test(entry.name)) {
        files.push(fullPath);
      }
    }
  }
  walk(dir);
  return files;
}

function resolveHtmlEntryFile() {
  for (const fileName of HTML_ENTRY_CANDIDATES) {
    const filePath = path.join(process.cwd(), fileName);
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }
  return null;
}

// Check 1: All view containers exist in HTML
function checkViewContainers() {
  log('\n📋 CHECK 1: View Containers', BLUE);
  const htmlFile = resolveHtmlEntryFile();
  if (!htmlFile) {
    fail('View Containers', `No HTML entry file found (checked: ${HTML_ENTRY_CANDIDATES.join(', ')})`);
    return;
  }
  
  const html = fs.readFileSync(htmlFile, 'utf-8');
  const pagesFile = path.join(process.cwd(), 'src/app/pages.js');
  const pagesContent = fs.readFileSync(pagesFile, 'utf-8');
  
  // Extract registered pages
  const pageMatches = pagesContent.match(/export const PAGES = \{([^}]+)\}/s);
  if (!pageMatches) {
    fail('View Containers', 'Could not parse PAGES registry');
    return;
  }
  
  const registeredPages = [];
  const pageLines = pageMatches[1].split('\n');
  for (const line of pageLines) {
    const match = line.match(/['"]?([\w-]+)['"]?\s*:/);
    if (match) {
      registeredPages.push(match[1]);
    }
  }
  
  log(`   Found ${registeredPages.length} registered pages: ${registeredPages.join(', ')}`);
  
  // Check each page has a container
  for (const page of registeredPages) {
    const viewId = `view-${page}`;
    if (!html.includes(`id="${viewId}"`) && !html.includes(`id='${viewId}'`)) {
      fail('View Containers', `Missing container: #${viewId}`, path.basename(htmlFile));
    } else {
      pass(`Container exists: #${viewId}`);
    }
  }
}

// Check 2: Router is single source of truth
function checkRouterUsage() {
  log('\n📋 CHECK 2: Router Usage', BLUE);
  const srcFiles = findFiles(path.join(process.cwd(), 'src'), /\.js$/, ['node_modules', '.git']);
  
  let oldSwitchViewCount = 0;
  let routerSwitchViewCount = 0;
  let switchViewCount = 0;
  
  for (const file of srcFiles) {
    const lines = readFileLines(file);
    lines.forEach((line, idx) => {
      // Check for old switchView patterns (not from router)
      if (line.includes('switchView(') && !line.includes('routerSwitchView') && !line.includes('window.switchView')) {
        if (!line.includes('export') && !line.includes('import') && !line.includes('//')) {
          oldSwitchViewCount++;
          warn('Router Usage', `Potential old switchView call: ${line.trim()}`, file, idx + 1);
        }
      }
      if (line.includes('routerSwitchView(')) {
        routerSwitchViewCount++;
      }
      if (line.includes('window.switchView') || line.includes('switchView(')) {
        switchViewCount++;
      }
    });
  }
  
  if (oldSwitchViewCount === 0) {
    pass('No old switchView patterns found');
  }
  log(`   Found ${routerSwitchViewCount} routerSwitchView calls`);
  log(`   Found ${switchViewCount} total switchView references`);
}

// Check 3: No process.* in renderer code
function checkProcessUsage() {
  log('\n📋 CHECK 3: Process Usage in Renderer', BLUE);
  const srcFiles = findFiles(path.join(process.cwd(), 'src'), /\.js$/, ['node_modules', '.git']);
  
  let processUsage = [];
  for (const file of srcFiles) {
    const lines = readFileLines(file);
    lines.forEach((line, idx) => {
      if (line.includes('process.') && !line.includes('//') && !line.includes('Note:')) {
        // Allow comments about process
        if (!line.trim().startsWith('//')) {
          processUsage.push({ file, line: idx + 1, content: line.trim() });
        }
      }
    });
  }
  
  if (processUsage.length === 0) {
    pass('No process.* usage in renderer code');
  } else {
    for (const usage of processUsage) {
      warn('Process Usage', `Found process.*: ${usage.content}`, usage.file, usage.line);
    }
  }
}

// Check 4: Duplicate function names
function checkDuplicateFunctions() {
  log('\n📋 CHECK 4: Duplicate Function Names', BLUE);
  const srcFiles = findFiles(path.join(process.cwd(), 'src'), /\.js$/, ['node_modules', '.git']);
  const htmlFile = resolveHtmlEntryFile();
  
  const functionNames = new Map();
  
  // Check JS files
  for (const file of srcFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const funcMatches = content.matchAll(/(?:export\s+)?(?:function|const)\s+(\w+)\s*[=:]/g);
    for (const match of funcMatches) {
      const name = match[1];
      if (!functionNames.has(name)) {
        functionNames.set(name, []);
      }
      functionNames.get(name).push(file);
    }
  }
  
  // Check HTML for function definitions
  if (fs.existsSync(htmlFile)) {
    const html = fs.readFileSync(htmlFile, 'utf-8');
    const htmlFuncMatches = html.matchAll(/(?:function|const)\s+(\w+)\s*[=:]/g);
    for (const match of htmlFuncMatches) {
      const name = match[1];
      if (!functionNames.has(name)) {
        functionNames.set(name, []);
      }
      functionNames.get(name).push(htmlFile);
    }
  }
  
  // Find duplicates
  const duplicates = [];
  for (const [name, files] of functionNames.entries()) {
    if (files.length > 1) {
      // Check if it's a legitimate export/import pattern
      const uniqueFiles = [...new Set(files)];
      if (uniqueFiles.length > 1) {
        duplicates.push({ name, files: uniqueFiles });
      }
    }
  }
  
  // Common render functions that might be duplicated
  const criticalFunctions = ['renderTasks', 'renderProjects', 'renderFiles', 'renderWorkflow', 'renderToday'];
  for (const dup of duplicates) {
    if (criticalFunctions.includes(dup.name)) {
      fail('Duplicate Functions', `Critical function ${dup.name} defined in multiple files`, dup.files.join(', '));
    } else {
      warn('Duplicate Functions', `Function ${dup.name} defined in multiple files: ${dup.files.join(', ')}`);
    }
  }
  
  if (duplicates.length === 0) {
    pass('No duplicate function names found');
  }
}

// Check 5: Inline onclick handlers
function checkInlineOnclick() {
  log('\n📋 CHECK 5: Inline onclick Handlers', BLUE);
  const htmlFile = resolveHtmlEntryFile();
  if (!htmlFile) {
    fail('Inline onclick', `No HTML entry file found (checked: ${HTML_ENTRY_CANDIDATES.join(', ')})`);
    return;
  }
  
  const lines = readFileLines(htmlFile);
  const onclickPattern = /onclick\s*=/i;
  const allowedPatterns = [
    /onclick="if\(event\.target===this\)/, // Modal close handlers
    /onclick="event\.stopPropagation\(\)/, // Event propagation
    /onclick="if\(window\./, // Window function checks
  ];
  
  let inlineCount = 0;
  lines.forEach((line, idx) => {
    if (onclickPattern.test(line)) {
      // Check if it's an allowed pattern
      const isAllowed = allowedPatterns.some(pattern => pattern.test(line));
      if (!isAllowed && !line.includes('// ALLOWED')) {
        inlineCount++;
        warn('Inline onclick', `Found inline onclick: ${line.trim().substring(0, 80)}...`, htmlFile, idx + 1);
      }
    }
  });
  
  if (inlineCount === 0) {
    pass('No problematic inline onclick handlers found');
  } else {
    log(`   Found ${inlineCount} inline onclick handlers (some may be allowed)`);
  }
}

// Check 6: Exports/Imports consistency
function checkExports() {
  log('\n📋 CHECK 6: Export/Import Consistency', BLUE);
  const srcFiles = findFiles(path.join(process.cwd(), 'src'), /\.js$/, ['node_modules', '.git']);
  
  // Check for common export patterns
  const exportPatterns = {
    'migrateData': 'src/utils/migrations.js',
    'normalizeProjectIdValue': 'src/utils/projectHelpers.js',
  };
  
  for (const [exportName, expectedFile] of Object.entries(exportPatterns)) {
    const filePath = path.join(process.cwd(), expectedFile);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (content.includes(`export.*${exportName}`) || content.includes(`export function ${exportName}`) || content.includes(`export const ${exportName}`)) {
        pass(`Export found: ${exportName}`);
      } else {
        fail('Exports', `Missing export: ${exportName}`, expectedFile);
      }
    }
  }
}

// Check 7: Release build assets
function checkReleaseAssets() {
  log('\n📋 CHECK 7: Release Build Assets', BLUE);
  const icns = path.join(process.cwd(), 'build/icon.icns');
  const entitlements = path.join(process.cwd(), 'build/entitlements.mac.plist');

  if (fs.existsSync(icns)) {
    pass('macOS app icon present (build/icon.icns)');
  } else {
    fail(
      'Release Assets',
      'Missing build/icon.icns — run npm run build:icons and commit the file (CI releases use the Electron icon without it)',
      'build/icon.icns'
    );
  }

  if (fs.existsSync(entitlements)) {
    pass('macOS entitlements present (build/entitlements.mac.plist)');
  } else {
    warn('Release Assets', 'Missing build/entitlements.mac.plist', 'build/entitlements.mac.plist');
  }

  const icon512 = path.join(process.cwd(), 'icon-512.png');
  if (fs.existsSync(icon512)) {
    pass('App PNG icon present (icon-512.png)');
  } else {
    fail('Release Assets', 'Missing icon-512.png', 'icon-512.png');
  }
}

// Check 8: Pages registry matches sidebar
function checkPagesRegistry() {
  log('\n📋 CHECK 8: Pages Registry vs Sidebar', BLUE);
  const pagesFile = path.join(process.cwd(), 'src/app/pages.js');
  const htmlFile = resolveHtmlEntryFile();
  
  if (!fs.existsSync(pagesFile) || !htmlFile || !fs.existsSync(htmlFile)) {
    fail('Pages Registry', 'Required files not found');
    return;
  }
  
  const pagesContent = fs.readFileSync(pagesFile, 'utf-8');
  const viewManagerFile = path.join(process.cwd(), 'src/app/viewManager.js');
  const viewManagerSource = fs.existsSync(viewManagerFile)
    ? fs.readFileSync(viewManagerFile, 'utf-8')
    : fs.readFileSync(htmlFile, 'utf-8');
  
  // Extract registered pages
  const pageMatches = pagesContent.match(/export const PAGES = \{([^}]+)\}/s);
  if (!pageMatches) {
    fail('Pages Registry', 'Could not parse PAGES registry');
    return;
  }
  
  const registeredPages = new Set();
  const pageLines = pageMatches[1].split('\n');
  for (const line of pageLines) {
    const match = line.match(/['"]?([\w-]+)['"]?\s*:/);
    if (match) {
      registeredPages.add(match[1]);
    }
  }
  
  // Sidebar is rendered from viewManager.js (data-nav), not static tasklist.html
  const sidebarNavMatches = viewManagerSource.matchAll(/data-nav\s*=\s*["']([\w-]+)["']/g);
  const sidebarViews = new Set();
  for (const match of sidebarNavMatches) {
    sidebarViews.add(match[1]);
  }
  
  // Check for mismatches
  for (const page of registeredPages) {
    if (!sidebarViews.has(page)) {
      warn('Pages Registry', `Page ${page} registered but not in sidebar`, 'src/app/pages.js');
    }
  }
  
  for (const view of sidebarViews) {
    if (!registeredPages.has(view)) {
      warn('Pages Registry', `Sidebar view ${view} not in pages registry`, 'src/app/viewManager.js');
    }
  }
  
  if (registeredPages.size === sidebarViews.size) {
    pass('Pages registry matches sidebar navigation');
  }
}

// Main audit function
function runAudit() {
  log('\n' + '='.repeat(60), BLUE);
  log('HOOKUPS VERIFICATION AUDIT', BLUE);
  log('='.repeat(60) + '\n', BLUE);
  
  checkViewContainers();
  checkRouterUsage();
  checkProcessUsage();
  checkDuplicateFunctions();
  checkInlineOnclick();
  checkExports();
  checkReleaseAssets();
  checkPagesRegistry();
  
  // Summary
  log('\n' + '='.repeat(60), BLUE);
  log('AUDIT SUMMARY', BLUE);
  log('='.repeat(60), BLUE);
  log(`\n✅ Passed: ${Object.keys(FAILURES).length === 0 ? 'All checks' : 'Some checks'}`);
  log(`❌ Failures: ${FAILURES.length}`);
  log(`⚠️  Warnings: ${WARNINGS.length}\n`);
  
  if (FAILURES.length > 0) {
    log('FAILURES:', RED);
    FAILURES.forEach((f, idx) => {
      log(`\n${idx + 1}. ${f.check}`, RED);
      log(`   ${f.message}`, RED);
      if (f.file) log(`   File: ${f.file}${f.line ? `:${f.line}` : ''}`, RED);
    });
  }
  
  if (WARNINGS.length > 0) {
    log('\nWARNINGS:', YELLOW);
    WARNINGS.forEach((w, idx) => {
      log(`\n${idx + 1}. ${w.check}`, YELLOW);
      log(`   ${w.message}`, YELLOW);
      if (w.file) log(`   File: ${w.file}${w.line ? `:${w.line}` : ''}`, YELLOW);
    });
  }
  
  // Exit code
  process.exit(FAILURES.length > 0 ? 1 : 0);
}

// Run audit
runAudit();
