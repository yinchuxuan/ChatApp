import { compareNumber, matchesState } from '../engine/predicate.js';
import { getStateValue, hasStateValue } from '../state/statePaths.js';

const DEFAULT_MAX_RETRIES = 2;
const MAX_VALIDATION_TEXT_CHARS = 131072;
const STATE_PATCH_PATTERN = /<state_patch>[\s\S]*?<\/state_patch>/g;

function countMatches(text, pattern, flags = '') {
  const matcher = new RegExp(pattern, `${flags}g`);
  let count = 0;
  let match;
  while ((match = matcher.exec(text)) !== null) {
    count += 1;
    if (match[0] === '') {
      const codePoint = text.codePointAt(matcher.lastIndex);
      matcher.lastIndex += flags.includes('u') && codePoint > 0xffff ? 2 : 1;
    }
  }
  return count;
}

function ruleFailure(rule, config, actual) {
  return {
    id: rule.id,
    message: rule.message,
    onFailure: rule.onFailure || config.onFailure || 'retry',
    actual
  };
}

function validateRegexRule(rule, config, rawContent) {
  const sourceName = rule.source || 'content';
  const source = sourceName === 'raw'
    ? rawContent
    : rawContent.replace(STATE_PATCH_PATTERN, '');
  if (source.length > MAX_VALIDATION_TEXT_CHARS) {
    return ruleFailure(rule, config, {
      source: sourceName,
      error: 'text_too_long',
      length: source.length,
      maxLength: MAX_VALIDATION_TEXT_CHARS
    });
  }
  try {
    const matches = countMatches(source, rule.pattern, rule.flags || '');
    if (compareNumber(matches, rule.matches)) return null;
    return ruleFailure(rule, config, { source: sourceName, matches });
  } catch (error) {
    return ruleFailure(rule, config, {
      source: sourceName,
      error: 'invalid_regex',
      detail: error.message
    });
  }
}

function finiteDelta(stateBefore, stateAfter, path) {
  const before = getStateValue(stateBefore, path);
  const after = getStateValue(stateAfter, path);
  if (!Number.isFinite(before) || !Number.isFinite(after)) return null;
  return after - before;
}

function validateStateRule(rule, config, stateBefore, stateAfter, updates) {
  const matching = updates.filter(update => update.path === rule.path);
  const valueExists = hasStateValue(stateAfter, rule.path);
  const actual = {
    updates: matching.length,
    operations: matching.map(update => update.operation),
    valueExists,
    value: valueExists ? getStateValue(stateAfter, rule.path) : null
  };
  const failed = [];
  if (rule.updates && !compareNumber(matching.length, rule.updates)) failed.push('updates');
  if (rule.operations && matching.some(update => !rule.operations.includes(update.operation))) {
    failed.push('operations');
  }
  if (matching.length > 0 && rule.value
    && !matchesState({ [rule.path]: rule.value }, stateAfter)) failed.push('value');
  if (matching.length > 0 && rule.delta) {
    actual.delta = finiteDelta(stateBefore, stateAfter, rule.path);
    if (actual.delta === null || !compareNumber(actual.delta, rule.delta)) failed.push('delta');
  }
  if (failed.length === 0) return null;
  return ruleFailure(rule, config, { ...actual, failed });
}

function validateRule(rule, config, context) {
  if (rule.enabled === false) return null;
  if (rule.when?.state && !matchesState(rule.when.state, context.stateBefore)) return null;
  if (rule.type === 'content.regex') {
    return validateRegexRule(rule, config, context.rawContent);
  }
  return validateStateRule(
    rule, config, context.stateBefore, context.stateAfter, context.updates
  );
}

function validateResponse({ config, rawContent = '', stateBefore = {}, stateAfter = {}, updates = [] }) {
  if (!config || !Array.isArray(config.rules) || config.rules.length === 0) {
    return { passed: true, action: null, violations: [] };
  }
  const context = { rawContent: String(rawContent || ''), stateBefore, stateAfter, updates };
  const violations = config.rules
    .map(rule => validateRule(rule, config, context))
    .filter(Boolean);
  const action = violations.some(item => item.onFailure === 'retry') ? 'retry' : 'warn';
  return {
    passed: violations.length === 0,
    action: violations.length === 0 ? null : action,
    violations
  };
}

function responseValidationMaxRetries(config) {
  return Number.isInteger(config?.maxRetries) ? config.maxRetries : DEFAULT_MAX_RETRIES;
}

export {
  DEFAULT_MAX_RETRIES,
  MAX_VALIDATION_TEXT_CHARS,
  responseValidationMaxRetries,
  validateResponse
};
