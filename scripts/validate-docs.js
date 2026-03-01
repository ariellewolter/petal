#!/usr/bin/env node

/**
 * Documentation Validation Script
 * 
 * Validates markdown file organization according to DOCUMENTATION_GUIDE.md
 * 
 * Usage: node scripts/validate-docs.js
 */

const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const GUIDE_FILE = path.join(DOCS_DIR, 'DOCUMENTATION_GUIDE.md');

// Expected directory structure
const EXPECTED_DIRS = {
  'architecture': 'System architecture docs',
  'guides': 'How-to guides',
  'plans': 'Future work plans',
  'analysis': 'Code analysis (historical)',
  'audit': 'Audit reports',
  'bug-reports': 'Bug reports',
  'fixes': 'Fix documentation',
  'summaries': 'Session summaries',
  'designs': 'Design documentation',
  'design': 'Design documentation (alternative)',
  'improvements': 'Improvement docs',
  'mobile': 'Mobile-specific docs',
  'templates': 'Documentation templates',
  'other': 'Miscellaneous'
};

// Naming patterns
const NAMING_PATTERNS = {
  status: /^[A-Z_]+_STATUS\.md$/,
  progress: /^[A-Z_]+_PROGRESS\.md$/,
  summary: /^[A-Z_]+_SUMMARY\.md$/,
  plan: /^[A-Z_]+_PLAN\.md$/,
  guide: /^[A-Z_]+_GUIDE\.md$/,
  analysis: /^[A-Z_]+_ANALYSIS\.md$/,
  audit: /^[A-Z_]+_AUDIT\.md$/,
  fix: /^[A-Z_]+_FIX\.md$/,
  template: /^[A-Z_]+_TEMPLATE\.md$/,
  bug: /^BUG_[A-Z_]+\.md$/,
  issue: /^ISSUE_[A-Z_]+\.md$/,
  mobile: /^MOBILE_[A-Z_]+\.md$/,
  using: /^USING_[A-Z_]+\.md$/,
  migrating: /^MIGRATING_[A-Z_]+\.md$/,
  howTo: /^HOW_TO_[A-Z_]+\.md$/
};

// Files that should be in root
const ROOT_FILES = [
  'README.md',
  'PROJECT_SUMMARY.md',
  'REFACTORING_STATUS.md',
  'INTEGRATION_PLANS.md',
  'ANALYSIS_INDEX.md',
  'DOCUMENTATION_GUIDE.md',
  'QUICK_REFERENCE.md'
];

// Collect all markdown files
function findMarkdownFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findMarkdownFiles(filePath, fileList);
    } else if (file.endsWith('.md')) {
      const relativePath = path.relative(path.join(__dirname, '..', 'docs'), filePath);
      fileList.push({
        path: relativePath,
        fullPath: filePath,
        name: file,
        dir: path.dirname(relativePath)
      });
    }
  });
  
  return fileList;
}

// Validate naming convention
function validateNaming(file) {
  const issues = [];
  
  // Check if it's uppercase with underscores
  if (!/^[A-Z][A-Z0-9_]*\.md$/.test(file.name)) {
    issues.push({
      type: 'naming',
      severity: 'warning',
      message: `File should use UPPERCASE with underscores: ${file.name}`
    });
  }
  
  // Check for descriptive names (at least 5 chars before .md)
  if (file.name.length < 9) {
    issues.push({
      type: 'naming',
      severity: 'warning',
      message: `File name might be too short: ${file.name}`
    });
  }
  
  return issues;
}

// Validate location
function validateLocation(file) {
  const issues = [];
  
  // Root files
  if (file.dir === '.' || file.dir === '') {
    if (!ROOT_FILES.includes(file.name)) {
      issues.push({
        type: 'location',
        severity: 'info',
        message: `File in root: ${file.name} - ensure it's a main document`
      });
    }
    return issues;
  }
  
  // Check if directory is expected
  const dirName = file.dir.split(path.sep)[0];
  if (!EXPECTED_DIRS[dirName] && dirName !== '') {
    issues.push({
      type: 'location',
      severity: 'warning',
      message: `Unexpected directory: ${dirName}/ - consider moving to appropriate directory or docs/other/`
    });
  }
  
  // Check naming patterns match location
  if (dirName === 'analysis' && !file.name.match(/ANALYSIS|AUDIT|REVIEW/)) {
    issues.push({
      type: 'location',
      severity: 'info',
      message: `Analysis file might benefit from *_ANALYSIS.md naming: ${file.name}`
    });
  }
  
  if (dirName === 'plans' && !file.name.match(/PLAN|ROADMAP|CHECKLIST/)) {
    issues.push({
      type: 'location',
      severity: 'info',
      message: `Plan file might benefit from *_PLAN.md naming: ${file.name}`
    });
  }
  
  return issues;
}

// Check for potential duplicates
function findPotentialDuplicates(files) {
  const duplicates = [];
  const nameMap = new Map();
  
  files.forEach(file => {
    const baseName = file.name.replace(/\.md$/, '').toLowerCase();
    if (nameMap.has(baseName)) {
      duplicates.push({
        file1: nameMap.get(baseName),
        file2: file.path
      });
    } else {
      nameMap.set(baseName, file.path);
    }
  });
  
  return duplicates;
}

// Main validation
function validateDocs() {
  console.log('📚 Validating documentation organization...\n');
  
  if (!fs.existsSync(DOCS_DIR)) {
    console.error('❌ docs/ directory not found!');
    process.exit(1);
  }
  
  const files = findMarkdownFiles(DOCS_DIR);
  console.log(`Found ${files.length} markdown files\n`);
  
  const allIssues = [];
  const duplicates = findPotentialDuplicates(files);
  
  files.forEach(file => {
    const namingIssues = validateNaming(file);
    const locationIssues = validateLocation(file);
    allIssues.push(...namingIssues, ...locationIssues);
  });
  
  // Report results
  const errors = allIssues.filter(i => i.severity === 'error');
  const warnings = allIssues.filter(i => i.severity === 'warning');
  const info = allIssues.filter(i => i.severity === 'info');
  
  if (errors.length > 0) {
    console.log('❌ Errors:');
    errors.forEach(issue => {
      console.log(`   - ${issue.message}`);
    });
    console.log();
  }
  
  if (warnings.length > 0) {
    console.log('⚠️  Warnings:');
    warnings.forEach(issue => {
      console.log(`   - ${issue.message}`);
    });
    console.log();
  }
  
  if (info.length > 0) {
    console.log('ℹ️  Suggestions:');
    info.forEach(issue => {
      console.log(`   - ${issue.message}`);
    });
    console.log();
  }
  
  if (duplicates.length > 0) {
    console.log('🔍 Potential duplicates:');
    duplicates.forEach(dup => {
      console.log(`   - ${dup.file1} and ${dup.file2}`);
    });
    console.log();
  }
  
  // Summary
  console.log('📊 Summary:');
  console.log(`   Total files: ${files.length}`);
  console.log(`   Errors: ${errors.length}`);
  console.log(`   Warnings: ${warnings.length}`);
  console.log(`   Suggestions: ${info.length}`);
  console.log(`   Potential duplicates: ${duplicates.length}`);
  console.log();
  
  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ All checks passed! Documentation is well organized.');
    return 0;
  } else if (errors.length === 0) {
    console.log('⚠️  Some warnings found, but no critical errors.');
    return 0;
  } else {
    console.log('❌ Errors found. Please fix them before proceeding.');
    return 1;
  }
}

// Run validation
if (require.main === module) {
  const exitCode = validateDocs();
  process.exit(exitCode);
}

module.exports = { validateDocs, findMarkdownFiles };
