const { extractExecIncludes, resolveExecIncludePath } = require('./execSource');

function collectContentFilePaths(card, paths) {
  Object.values(card?.files || {}).forEach((filePath) => {
    if (typeof filePath === 'string') paths.add(filePath);
  });
}

function collectExecSourceFiles(value, paths) {
  if (Array.isArray(value)) return value.forEach((item) => collectExecSourceFiles(item, paths));
  if (!value || typeof value !== 'object') return;
  if (value.type === 'exec' && typeof value.sourceFile === 'string') paths.add(value.sourceFile);
  Object.values(value).forEach((item) => collectExecSourceFiles(item, paths));
}

function collectExecSourcePaths(card) {
  const paths = new Set();
  collectExecSourceFiles(card?.rules, paths);
  return [...paths];
}

function collectFileContentPaths(card) {
  const paths = new Set();
  collectContentFilePaths(card, paths);
  collectExecSourceFiles(card?.rules, paths);
  return [...paths];
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { collectExecSourcePaths, collectFileContentPaths, extractExecIncludes, resolveExecIncludePath };
}
