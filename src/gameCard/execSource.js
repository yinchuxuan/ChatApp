function resolveFilePath(requestedPath, options) {
  const nodePath = options.path || (typeof require === 'function' ? require('path') : null);
  if (!nodePath || !options.baseDir) throw new Error('exec sourceFile requires a baseDir');
  if (nodePath.isAbsolute(requestedPath)) throw new Error('exec sourceFile path must be relative');
  const baseDir = nodePath.resolve(options.baseDir);
  const filePath = nodePath.resolve(baseDir, requestedPath);
  if (filePath !== baseDir && !filePath.startsWith(baseDir + nodePath.sep)) {
    throw new Error('exec sourceFile path must stay inside game card directory');
  }
  return filePath;
}

function readSourceFile(filePath, options = {}) {
  if (options.fileContents && Object.prototype.hasOwnProperty.call(options.fileContents, filePath)) {
    return options.fileContents[filePath];
  }
  const nodeFs = options.fs || (typeof require === 'function' ? require('fs') : null);
  if (!nodeFs || typeof nodeFs.readFileSync !== 'function') {
    throw new Error('exec sourceFile requires fs.readFileSync');
  }
  return nodeFs.readFileSync(resolveFilePath(filePath, options), 'utf-8');
}

function resolveExecSource(action, options = {}) {
  const hasSource = typeof action?.source === 'string';
  const hasSourceFile = typeof action?.sourceFile === 'string';
  if (hasSource && hasSourceFile) throw new Error('exec requires source or sourceFile, not both');
  if (hasSourceFile) return readSourceFile(action.sourceFile, options);
  if (hasSource) return action.source;
  throw new Error('exec requires source or sourceFile');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { resolveExecSource };
}
