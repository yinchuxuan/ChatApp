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
  throw new Error(`unsupported content source: ${body}`);
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
  const pattern = /([A-Za-z_][A-Za-z0-9_]*)\s*:\s*('((?:\\.|[^'])*)'|"((?:\\.|[^"])*)"|[0-9]+)/g;
  let match;
  while ((match = pattern.exec(argsText))) {
    const rawValue = match[3] !== undefined ? match[3] : match[4];
    args[match[1]] = rawValue !== undefined ? rawValue.replace(/\\(['"\\])/g, '$1') : Number(match[2]);
  }
  return args;
}

function applyTransform(value, transform) {
  if (transform.name === 'regex_replace') {
    return value.replace(
      new RegExp(transform.args.pattern || '', transform.args.flags || ''),
      transform.args.with || ''
    );
  }
  if (transform.name === 'regex_extract') {
    const match = value.match(new RegExp(transform.args.pattern || ''));
    const group = transform.args.group || 0;
    return match && match[group] !== undefined ? match[group] : '';
  }
  throw new Error(`unsupported content transform: ${transform.name}`);
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
  if (typeof content !== 'string') return '';
  if (!content.includes('{{')) return content;
  if (!content.trimStart().startsWith('{{')) {
    return content.replaceAll('{{original_content}}', originalMessage.content || '');
  }

  let cursor = 0;
  let resolved = '';
  while (cursor < content.length) {
    const chain = parseChain(content, cursor, originalMessage, options);
    resolved += chain.value;
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
