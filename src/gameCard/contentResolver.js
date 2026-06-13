const { applyTransform, renderValue } = require('./contentTransforms');
const { resolveContentObject } = require('./contentObjects');
const { resolveFileSource } = require('./contentFiles');
const { getStateValue, hasStateValue } = require('./statePaths');

function parseSource(expression, index) {
  if (!expression.startsWith('{{', index)) throw new Error('content source expected');

  let cursor = index + 2;
  let body = '';
  while (cursor < expression.length) {
    if (expression[cursor] === '\\') {
      body += expression.slice(cursor, cursor + 2);
      cursor += 2;
    } else if (expression.startsWith('}}', cursor)) {
      return { body, next: cursor + 2 };
    } else {
      body += expression[cursor];
      cursor += 1;
    }
  }
  throw new Error('content source is not closed');
}

function decodeRawString(value) {
  return value.replaceAll('\\}}', '}}').replaceAll('\\\\', '\\');
}

function resolveSource(body, originalMessage, options) {
  if (body === 'original_content') return originalMessage.content || '';
  if (body.startsWith('raw_string:')) return decodeRawString(body.slice('raw_string:'.length));
  if (body.startsWith('state:')) return resolveState(body.slice('state:'.length), options, false);
  if (body.startsWith('state_json:')) return resolveState(body.slice('state_json:'.length), options, true);
  if (body.startsWith('file:')) return resolveFileSource(body.slice('file:'.length), options);
  throw new Error(`unsupported content source: ${body}`);
}

function resolveState(statePath, options, asJson) {
  const state = options.state || {};
  if (!hasStateValue(state, statePath)) return '';
  const value = getStateValue(state, statePath);
  if (value === undefined || value === null) return '';
  if (asJson) return JSON.stringify(value);
  if (Array.isArray(value)) return value;
  return typeof value === 'object' ? '' : String(value);
}

function parseTransform(expression, index) {
  const match = expression.slice(index).match(/^\.([A-Za-z_][A-Za-z0-9_]*)\{/);
  if (!match) return null;

  let cursor = index + match[0].length;
  let args = '';
  let quote = null;
  while (cursor < expression.length) {
    const char = expression[cursor];
    if (char === '\\') {
      args += expression.slice(cursor, cursor + 2);
      cursor += 2;
    } else if (quote) {
      quote = char === quote ? null : quote;
      args += char;
      cursor += 1;
    } else if (char === '\'' || char === '"') {
      quote = char;
      args += char;
      cursor += 1;
    } else if (char === '}') {
      return { name: match[1], args: parseArgs(args), next: cursor + 1 };
    } else {
      args += char;
      cursor += 1;
    }
  }
  throw new Error(`transform is not closed: ${match[1]}`);
}

function parseArgs(argsText) {
  const args = {};
  const positional = argsText.trim().match(/^'((?:\\.|[^'])*)'$|^"((?:\\.|[^"])*)"$/);
  if (positional) {
    args.value = decodeArg(positional[1] !== undefined ? positional[1] : positional[2]);
    return args;
  }
  const pattern = /([A-Za-z_][A-Za-z0-9_]*)\s*:\s*('((?:\\.|[^'])*)'|"((?:\\.|[^"])*)"|[0-9]+)/g;
  let match;
  while ((match = pattern.exec(argsText))) {
    const rawValue = match[3] !== undefined ? match[3] : match[4];
    args[match[1]] = rawValue !== undefined ? decodeArg(rawValue) : Number(match[2]);
  }
  return args;
}

function decodeArg(value) {
  return value.replace(/\\(['"\\])/g, '$1').replace(/\\n/g, '\n');
}

function skipSpaces(expression, index) {
  let cursor = index;
  while (/\s/.test(expression[cursor] || '')) cursor += 1;
  return cursor;
}

function parseChain(expression, index, originalMessage, options) {
  const source = parseSource(expression, skipSpaces(expression, index));
  let value = resolveSource(source.body, originalMessage, options);
  let cursor = skipSpaces(expression, source.next);
  let transform = parseTransform(expression, cursor);

  while (transform) {
    value = applyTransform(value, transform);
    cursor = skipSpaces(expression, transform.next);
    transform = parseTransform(expression, cursor);
  }
  return { value, next: cursor };
}

function resolveContent(content, originalMessage = {}, options = {}) {
  if (content && typeof content === 'object') {
    return resolveContentObject(content, originalMessage, options, resolveContent);
  }
  if (typeof content !== 'string') return '';
  if (!content.includes('{{')) return content;
  if (!content.trimStart().startsWith('{{')) {
    return content.replaceAll('{{original_content}}', originalMessage.content || '');
  }

  let cursor = 0;
  let resolved = '';
  while (cursor < content.length) {
    const chain = parseChain(content, cursor, originalMessage, options);
    resolved += renderValue(chain.value);
    cursor = skipSpaces(content, chain.next);
    if (cursor < content.length) {
      if (content[cursor] !== '+') throw new Error('content chains must be joined with +');
      cursor += 1;
    }
  }
  return resolved;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { resolveContent };
}
