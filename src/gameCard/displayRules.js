const MAX_RULES = 50;
const MAX_PATTERN_LENGTH = 1000;
const MAX_INPUT_LENGTH = 100000;
const ALLOWED_FLAGS = /^[gimsu]*$/;

function warnRule(rule, message) {
  if (typeof console !== 'undefined' && console.warn) {
    console.warn(`display rule skipped${rule?.id ? ` (${rule.id})` : ''}: ${message}`);
  }
}

function validFlags(flags) {
  if (typeof flags !== 'string' || !ALLOWED_FLAGS.test(flags)) return false;
  return new Set(flags).size === flags.length;
}

function applyRegexReplace(content, rule) {
  if (rule.stage !== 'before_markdown' || rule.type !== 'regex_replace') return content;
  if (typeof rule.pattern !== 'string' || rule.pattern.length > MAX_PATTERN_LENGTH) {
    warnRule(rule, 'invalid pattern');
    return content;
  }
  const flags = rule.flags === undefined ? '' : rule.flags;
  if (!validFlags(flags)) {
    warnRule(rule, 'invalid flags');
    return content;
  }
  try {
    return content.replace(new RegExp(rule.pattern, flags), String(rule.replace ?? ''));
  } catch (error) {
    warnRule(rule, error.message || 'regex failed');
    return content;
  }
}

function getRules(display, role) {
  const rules = display?.[role];
  return Array.isArray(rules) ? rules.slice(0, MAX_RULES) : [];
}

function applyDisplayRules(content, display, role) {
  if (typeof content !== 'string' || content.length > MAX_INPUT_LENGTH) return content;
  return getRules(display, role).reduce((text, rule) => {
    if (!rule || typeof rule !== 'object' || rule.enabled === false) return text;
    return applyRegexReplace(text, rule);
  }, content);
}

function getAssistantRules(display) {
  return getRules(display, 'assistant');
}

function applyAssistantDisplayRules(content, display) {
  return applyDisplayRules(content, display, 'assistant');
}

function applyUserDisplayRules(content, display) {
  return applyDisplayRules(content, display, 'user');
}

if (typeof window !== 'undefined') {
  window.GameCardDisplayRules = { applyAssistantDisplayRules, applyUserDisplayRules, getAssistantRules, getRules };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { applyAssistantDisplayRules, applyUserDisplayRules, getAssistantRules, getRules };
}
