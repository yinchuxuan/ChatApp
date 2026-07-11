const fs = require('node:fs');
const path = require('node:path');

const MAX_DEPTH = 20;

function isImport(value) {
  return value && !Array.isArray(value) && typeof value === 'object' &&
    Object.keys(value).length === 1 && typeof value.$import === 'string';
}

function resolveImport(root, relativePath) {
  if (!relativePath || path.isAbsolute(relativePath) || path.extname(relativePath) !== '.json') {
    throw new Error('invalid game card import path');
  }
  const resolved = path.resolve(root, relativePath);
  if (!resolved.startsWith(path.resolve(root) + path.sep)) {
    throw new Error('game card import must stay inside card directory');
  }
  return resolved;
}

function expand(value, context) {
  if (isImport(value)) {
    const file = resolveImport(context.root, value.$import);
    if (context.stack.includes(file)) throw new Error(`circular game card import: ${value.$import}`);
    if (context.stack.length >= MAX_DEPTH) throw new Error('game card import depth limit exceeded');
    const imported = JSON.parse(fs.readFileSync(file, 'utf8'));
    return expand(imported, { ...context, stack: [...context.stack, file] });
  }
  if (Array.isArray(value)) {
    return value.flatMap(item => {
      const expanded = expand(item, context);
      return Array.isArray(expanded) ? expanded : [expanded];
    });
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, expand(child, context)]));
  }
  return value;
}

function readImportedJson(file) {
  const root = path.dirname(file);
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  return expand(value, { root, stack: [file] });
}

module.exports = { readImportedJson };
