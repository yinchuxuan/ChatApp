const { extractUniqueFileSection } = require('./fileSections');
const { getStateValue, hasStateValue } = require('./statePaths');

const FILE_PATH_PATTERN = /^(?![/\\])(?!.*(?:^|[/\\])\.\.(?:[/\\]|$)).+\.(md|txt|json)$/i;

function readDeclaredFile(filePath, options) {
  if (options.fileContents && Object.prototype.hasOwnProperty.call(options.fileContents, filePath)) {
    return options.fileContents[filePath];
  }
  const nodeFs = options.fs || (typeof require === 'function' ? require('fs') : null);
  const nodePath = options.path || (typeof require === 'function' ? require('path') : null);
  if (!nodeFs?.readFileSync || !nodePath || !options.baseDir) throw new Error('file requires preloaded content or a baseDir');
  if (nodePath.isAbsolute(filePath)) throw new Error('file path must be relative');
  const baseDir = nodePath.resolve(options.baseDir);
  const resolved = nodePath.resolve(baseDir, filePath);
  if (resolved !== baseDir && !resolved.startsWith(baseDir + nodePath.sep)) {
    throw new Error('file path must stay inside game card directory');
  }
  return nodeFs.readFileSync(resolved, 'utf-8');
}

function resolveRefValue(ref, options, label) {
  const value = ref.trim();
  if (!value.startsWith('$')) return value;
  const statePath = value.slice(1).replace(/^state\./, '');
  if (!hasStateValue(options.state || {}, statePath)) throw new Error(`${label} state not found: ${statePath}`);
  const resolved = getStateValue(options.state || {}, statePath);
  if (typeof resolved !== 'string' || resolved.length === 0) throw new Error(`${label} requires string state: ${statePath}`);
  return resolved;
}

function parseFileRef(ref) {
  const marker = ref.indexOf('#');
  if (marker < 0) return { fileRef: ref.trim(), sectionRef: '' };
  return { fileRef: ref.slice(0, marker).trim(), sectionRef: ref.slice(marker + 1).trim() };
}

function resolveFileSource(ref, options) {
  const { fileRef, sectionRef } = parseFileRef(ref);
  const fileId = resolveRefValue(fileRef, options, 'file');
  const filePath = options.card?.files?.[fileId];
  if (!filePath) throw new Error(`unknown content file id: ${fileId}`);
  const content = readDeclaredFile(filePath, options);
  if (!sectionRef) return content;
  const heading = resolveRefValue(sectionRef, options, 'file section');
  return extractUniqueFileSection(content, heading);
}

function validateContentFiles(files, path = 'files') {
  const errors = [];
  if (files === undefined) return errors;
  if (!files || typeof files !== 'object' || Array.isArray(files)) return [`${path}: must be an object`];
  Object.entries(files).forEach(([key, filePath]) => {
    if (!key) errors.push(`${path}: file id must be non-empty`);
    if (typeof filePath !== 'string' || !FILE_PATH_PATTERN.test(filePath)) {
      errors.push(`${path}.${key}: path must be a safe relative text file`);
    }
  });
  return errors;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    FILE_PATH_PATTERN,
    resolveFileSource,
    validateContentFiles
  };
}
