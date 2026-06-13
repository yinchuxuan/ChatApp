const { validateWhen, validateAction, validatePredicate } = require('./validatePredicates');
const { validateFind } = require('./validateFind');
const { validateAudioConfig } = require('./audioConfig');
const { validateVisualConfig } = require('./visualConfig');
const { validateContentFiles } = require('./contentFiles');

function addError(errors, path, message) {
  errors.push(`${path}: ${message}`);
}

function validateRule(rule, path, errors) {
  if (!rule || typeof rule !== 'object' || Array.isArray(rule)) {
    addError(errors, path, 'must be an object');
    return;
  }

  if (rule.when === undefined) addError(errors, path, 'requires when');
  else validateWhen(rule.when, path + '.when', errors);
  validateFind(rule.find, path + '.find', errors, validatePredicate);

  if (!Array.isArray(rule.then) || rule.then.length === 0) addError(errors, path + '.then', 'must be a non-empty array');
  else rule.then.forEach((action, i) => validateAction(action, path + '.then[' + i + ']', errors));
}

function validateGameCard(card) {
  const errors = [];

  if (!card || typeof card !== 'object' || Array.isArray(card)) {
    errors.push('card must be an object');
    return { valid: false, errors };
  }

  for (const field of ['version', 'id', 'name', 'rules']) {
    if (card[field] === undefined) addError(errors, field, 'is required');
  }

  if (!Array.isArray(card.rules)) {
    errors.push('rules must be an array');
    return { valid: errors.length === 0, errors };
  }

  errors.push(
    ...validateAudioConfig(card.audio),
    ...validateVisualConfig(card.visual),
    ...validateContentFiles(card.files)
  );
  card.rules.forEach((rule, i) => validateRule(rule, 'rules[' + i + ']', errors));

  return { valid: errors.length === 0, errors };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { validateGameCard, validateRule };
}
