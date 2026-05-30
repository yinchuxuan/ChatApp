function isObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

function addError(errors, path, message) {
  errors.push(`${path}: ${message}`);
}

function validateContentBranch(branch, path, errors, validateWhen) {
  if (!isObject(branch)) return addError(errors, path, 'must be an object');
  Object.keys(branch).forEach((key) => {
    if (!['when', 'content'].includes(key)) addError(errors, path, 'unknown content branch key: ' + key);
  });
  if (branch.content === undefined) addError(errors, path + '.content', 'is required');
  else validateContent(branch.content, path + '.content', errors, validateWhen);
  if (branch.when !== undefined && !isObject(branch.when)) addError(errors, path + '.when', 'must be an object');
  else if (branch.when !== undefined && Object.keys(branch.when).length === 0) addError(errors, path + '.when', 'must be a non-empty object');
  else if (branch.when !== undefined) validateWhen(branch.when, path + '.when', errors);
}

function validateBranchList(value, path, errors, validateWhen) {
  if (!Array.isArray(value) || value.length === 0) {
    return addError(errors, path, 'must be a non-empty array');
  }
  value.forEach((branch, index) => validateContentBranch(branch, `${path}[${index}]`, errors, validateWhen));
}

function validateContentObject(content, path, errors, validateWhen) {
  const keys = Object.keys(content);
  const allowed = ['include', 'select', 'default', 'join', 'prefix', 'suffix'];
  keys.forEach((key) => {
    if (!allowed.includes(key)) addError(errors, path, 'unknown content key: ' + key);
  });
  if (content.include !== undefined && content.select !== undefined) addError(errors, path, 'cannot use include and select together');
  if (content.include === undefined && content.select === undefined) addError(errors, path, 'requires include or select');
  if (content.include !== undefined) validateBranchList(content.include, path + '.include', errors, validateWhen);
  if (content.select !== undefined) validateBranchList(content.select, path + '.select', errors, validateWhen);
  ['default', 'prefix', 'suffix'].forEach((key) => {
    if (content[key] !== undefined) validateContent(content[key], path + '.' + key, errors, validateWhen);
  });
  if (content.join !== undefined && typeof content.join !== 'string') addError(errors, path + '.join', 'must be a string');
}

function validateContent(content, path, errors, validateWhen) {
  if (typeof content === 'string') return;
  if (isObject(content)) return validateContentObject(content, path, errors, validateWhen);
  addError(errors, path, 'must be a string or content object');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { validateContent };
}
