const path = require('path');

const MAX_IMPORT_DEPTH = 20;

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function isImportObject(value) {
  return isPlainObject(value) && Object.keys(value).length === 1 && typeof value.$import === 'string';
}

function assertSafeImportPath(relativePath) {
  if (!relativePath || path.isAbsolute(relativePath) || relativePath.includes('\\')) {
    throw new Error('game card import path must be a relative json path');
  }
  const parts = relativePath.split('/');
  if (parts.some(part => part === '..' || part === '')) {
    throw new Error('game card import path must stay inside game card directory');
  }
  if (path.extname(relativePath) !== '.json') {
    throw new Error('game card import path must point to a .json file');
  }
}

function resolveImportPath(cardDir, relativePath) {
  assertSafeImportPath(relativePath);
  const filePath = path.resolve(cardDir, relativePath);
  const rootPath = path.resolve(cardDir);
  if (filePath !== rootPath && !filePath.startsWith(rootPath + path.sep)) {
    throw new Error('game card import path must stay inside game card directory');
  }
  return filePath;
}

function readJson(fs, filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`game card import not found: ${path.basename(filePath)}`);
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function expandImports(value, context) {
  if (isImportObject(value)) {
    const filePath = resolveImportPath(context.cardDir, value.$import);
    if (context.stack.includes(filePath)) {
      throw new Error(`circular game card import: ${value.$import}`);
    }
    if (context.stack.length >= MAX_IMPORT_DEPTH) {
      throw new Error('game card import depth limit exceeded');
    }
    return expandImports(readJson(context.fs, filePath), {
      ...context,
      stack: [...context.stack, filePath]
    });
  }
  if (Array.isArray(value)) {
    return value.flatMap(item => {
      const expanded = expandImports(item, context);
      return Array.isArray(expanded) ? expanded : [expanded];
    });
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, expandImports(child, context)])
    );
  }
  return value;
}

function readGameCardJson(fs, cardPath, fallback = null) {
  if (!fs.existsSync(cardPath)) return fallback;
  const cardDir = path.dirname(cardPath);
  return expandImports(readJson(fs, cardPath), { fs, cardDir, stack: [cardPath] });
}

module.exports = {
  expandImports,
  readGameCardJson,
  resolveImportPath
};
