function toList(value) {
  return Array.isArray(value) ? value : [String(value ?? '')];
}

function mapValue(value, fn, dropEmpty = false) {
  if (!Array.isArray(value)) return fn(String(value ?? ''));
  const mapped = value.map((item) => fn(String(item ?? '')));
  return dropEmpty ? mapped.filter((item) => item !== '') : mapped;
}

function regexReplace(value, args) {
  return mapValue(value, (item) => {
    return item.replace(new RegExp(args.pattern || '', args.flags || ''), args.with || '');
  });
}

function regexExtract(value, args) {
  return mapValue(value, (item) => {
    const match = item.match(new RegExp(args.pattern || ''));
    if (!match) return '';
    const defaultGroup = match.length > 1 ? 1 : 0;
    const group = args.group === undefined ? defaultGroup : Number(args.group);
    return match[group] !== undefined ? match[group] : '';
  }, Array.isArray(value));
}

function formatValue(value, args) {
  const template = args.value || '';
  return mapValue(value, (item) => template.replaceAll('{{value}}', item));
}

function joinValue(value, args) {
  if (!Array.isArray(value)) return String(value ?? '');
  return value.join(args.value || '');
}

function applyTransform(value, transform) {
  if (transform.name === 'regex_replace') return regexReplace(value, transform.args);
  if (transform.name === 'regex_extract') return regexExtract(value, transform.args);
  if (transform.name === 'format') return formatValue(value, transform.args);
  if (transform.name === 'join') return joinValue(value, transform.args);
  throw new Error(`unsupported content transform: ${transform.name}`);
}

function renderValue(value, joiner = '\n') {
  if (Array.isArray(value)) return value.join(joiner);
  return String(value ?? '');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { applyTransform, renderValue, toList };
}
