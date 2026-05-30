const { matchesWhen } = require('./predicate');

function resolveWhen(when, options) {
  if (when === undefined) return true;
  const phase = options.event?.phase || when.phase || 'pre_send';
  const normalized = when.phase ? when : { ...when, phase };
  return matchesWhen(normalized, phase, options.messages || [], options.state || {});
}

function resolveBranchContent(branch, originalMessage, options, resolveContent) {
  return resolveContent(branch.content, originalMessage, options);
}

function withAffixes(value, content, originalMessage, options, resolveContent) {
  const prefix = content.prefix === undefined ? '' : resolveContent(content.prefix, originalMessage, options);
  const suffix = content.suffix === undefined ? '' : resolveContent(content.suffix, originalMessage, options);
  return prefix + value + suffix;
}

function resolveInclude(content, originalMessage, options, resolveContent) {
  const parts = content.include
    .filter((branch) => resolveWhen(branch.when, options))
    .map((branch) => resolveBranchContent(branch, originalMessage, options, resolveContent));
  return withAffixes(parts.join(content.join ?? '\n'), content, originalMessage, options, resolveContent);
}

function resolveSelect(content, originalMessage, options, resolveContent) {
  const branch = content.select.find((item) => resolveWhen(item.when, options));
  const selected = branch
    ? resolveBranchContent(branch, originalMessage, options, resolveContent)
    : resolveContent(content.default ?? '', originalMessage, options);
  return withAffixes(selected, content, originalMessage, options, resolveContent);
}

function resolveContentObject(content, originalMessage, options, resolveContent) {
  if (Array.isArray(content?.include)) return resolveInclude(content, originalMessage, options, resolveContent);
  if (Array.isArray(content?.select)) return resolveSelect(content, originalMessage, options, resolveContent);
  return '';
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { resolveContentObject, resolveWhen };
}
