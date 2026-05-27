const { matchesPredicate } = require('./predicate');
const { applyTransform, renderValue } = require('./contentTransforms');
const { parseFileSectionRef, extractFileSection } = require('./fileSections');

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

function resolveFilePath(requestedPath, options) {
  const nodePath = options.path || (typeof require === 'function' ? require('path') : null);
  if (!nodePath || !options.baseDir) throw new Error('file_content requires a baseDir');
  if (nodePath.isAbsolute(requestedPath)) throw new Error('file_content path must be relative');

  const baseDir = nodePath.resolve(options.baseDir);
  const filePath = nodePath.resolve(baseDir, requestedPath);
  if (filePath !== baseDir && !filePath.startsWith(baseDir + nodePath.sep)) {
    throw new Error('file_content path must stay inside game card directory');
  }
  return filePath;
}

function readFileContent(requestedPath, options) {
  if (options.fileContents && Object.prototype.hasOwnProperty.call(options.fileContents, requestedPath)) {
    return options.fileContents[requestedPath];
  }
  const nodeFs = options.fs || (typeof require === 'function' ? require('fs') : null);
  if (!nodeFs || typeof nodeFs.readFileSync !== 'function') {
    throw new Error('file_content requires fs.readFileSync');
  }
  return nodeFs.readFileSync(resolveFilePath(requestedPath, options), 'utf-8');
}

function resolveSource(body, originalMessage, options) {
  if (body === 'original_content') return originalMessage.content || '';
  if (body.startsWith('raw_string:')) return decodeRawString(body.slice('raw_string:'.length));
  if (body.startsWith('file_content:')) {
    return readFileContent(body.slice('file_content:'.length), options);
  }
  if (body.startsWith('file_section:')) {
    const ref = body.slice('file_section:'.length);
    return extractFileSection(readFileContent(parseFileSectionRef(ref).filePath, options), ref);
  }
  if (body.startsWith('find:')) return resolveFind(body.slice('find:'.length), options);
  throw new Error(`unsupported content source: ${body}`);
}

function resolveFind(name, options) {
  const spec = options.find?.[name];
  if (!spec) throw new Error(`unknown find source: ${name}`);
  const messages = Array.isArray(options.messages) ? options.messages : [];
  return messages
    .filter((message, index) => matchesPredicate(spec.predicate, message, index, messages))
    .map((message) => message.content || '');
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
  const findName = source.body.startsWith('find:') ? source.body.slice('find:'.length) : null;
  return { value, findName, next: cursor };
}

function resolveContent(content, originalMessage = {}, options = {}) {
  if (typeof content !== 'string') return '';
  if (!content.includes('{{')) return content;
  if (!content.trimStart().startsWith('{{')) {
    return content.replaceAll('{{original_content}}', originalMessage.content || '');
  }

  let cursor = 0;
  let resolved = '';
  while (cursor < content.length) {
    const chain = parseChain(content, cursor, originalMessage, options);
    const joiner = chain.findName ? options.find?.[chain.findName]?.join : undefined;
    resolved += renderValue(chain.value, joiner || '\n');
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
