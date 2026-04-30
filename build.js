// Build script: Pre-compile JSX files to plain JavaScript
// This eliminates runtime Babel transformation for faster app startup

const fs = require('fs');
const path = require('path');
const babel = require('@babel/core');

const srcDir = path.join(__dirname, 'src');
const outputDir = path.join(__dirname, 'dist');
const babelConfig = require('./babel.config.js');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}
fs.mkdirSync(path.join(outputDir, 'components'), { recursive: true });

// Auto-scan src/ directory for .js and .jsx files
function scanJsFiles(dir, relativePath = '') {
  let results = [];
  const entries = fs.readdirSync(path.join(dir, relativePath), { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = relativePath ? path.join(relativePath, entry.name) : entry.name;
    if (entry.isDirectory()) {
      results = results.concat(scanJsFiles(dir, fullPath));
    } else if (entry.name.endsWith('.js') || entry.name.endsWith('.jsx')) {
      results.push(fullPath);
    }
  }
  return results;
}

// Process compiled code line-by-line to strip module syntax for browser use.
// Handles multi-line Object.defineProperty blocks via a state machine,
// which is more reliable than the previous regex-only approach.
function wrapForBrowser(code) {
  const lines = code.split('\n');
  const result = [];
  let skipBlockDepth = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // If we're inside a skip-block, track depth until it closes
    if (skipBlockDepth >= 0) {
      for (const ch of line) {
        if (ch === '{') skipBlockDepth++;
        if (ch === '}') skipBlockDepth--;
      }
      if (skipBlockDepth < 0) skipBlockDepth = -1;
      continue;
    }

    const trimmed = line.trimStart();

    // Start skip-block for multi-line Object.defineProperty(exports, "__esModule", ...)
    if (/^Object\.defineProperty\(exports,?\s*"?__esModule"?/.test(trimmed) && /{/.test(line)) {
      let depth = 0;
      for (const ch of line) {
        if (ch === '{') depth++;
        if (ch === '}') depth--;
      }
      if (depth > 0) {
        skipBlockDepth = depth - 1;
        continue;
      }
      // Single-line version: still skip
      continue;
    }

    // Skip single-line CommonJS module boilerplate
    if (/^exports\.__esModule\s*=/.test(trimmed)) continue;
    if (/^var\s+_default\s*=\s*exports\.default/.test(trimmed)) continue;
    if (/^module\.exports\s*=/.test(trimmed)) continue;
    if (/^exports\.default\s*=/.test(trimmed)) continue;

    // Convert "exports.foo = ..." to "window.foo = ..." for browser globals
    const exportAssign = trimmed.match(/^exports\.(\w+)\s*=\s*(.+);?\s*$/);
    if (exportAssign) {
      result.push(`window.${exportAssign[1]} = ${exportAssign[2]};`);
      continue;
    }

    // Skip require() assignments
    if (/^var\s+\w+\s*=\s*require\(['"][^'"]+['"]\);?\s*$/.test(trimmed)) continue;
    if (/^require\(['"][^'"]+['"]\);?\s*$/.test(trimmed)) continue;

    // Skip import/export statements
    if (/^import\s+/.test(trimmed)) continue;
    if (/^export\s+(default|{|const|function|class|var|let)\s/.test(trimmed)) continue;

    // Skip "use strict";
    if (/^"use strict";?\s*$/.test(trimmed)) continue;

    result.push(line);
  }

  return result.join('\n');
}

function compileFile(filePath) {
  const fullPath = path.join(srcDir, filePath);
  const code = fs.readFileSync(fullPath, 'utf8');

  const result = babel.transformSync(code, {
    ...babelConfig,
    filename: fullPath,
    sourceMaps: false
  });

  return wrapForBrowser(result.code);
}

const filesToCompile = scanJsFiles(srcDir);

console.log('Building pre-compiled JavaScript files...');

filesToCompile.forEach((file) => {
  const outputFileName = file.endsWith('.jsx') ? file.replace('.jsx', '.js') : file;
  const outputPath = path.join(outputDir, outputFileName);
  const compiled = compileFile(file);
  fs.writeFileSync(outputPath, compiled, 'utf8');
  console.log(`  Compiled: ${file} -> dist/${outputFileName}`);
});

console.log('Build complete.');
