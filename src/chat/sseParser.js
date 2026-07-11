function createSSEParser(onEvent) {
  let buffer = '';
  let dataLines = [];
  let eventType = '';

  function dispatch() {
    if (dataLines.length > 0) onEvent({ type: eventType || 'message', data: dataLines.join('\n') });
    dataLines = [];
    eventType = '';
  }

  function processLine(line) {
    if (line === '') { dispatch(); return; }
    if (line.startsWith(':')) return;
    const separator = line.indexOf(':');
    const field = separator < 0 ? line : line.slice(0, separator);
    const value = separator < 0 ? '' : line.slice(separator + 1).replace(/^ /, '');
    if (field === 'data') dataLines.push(value);
    if (field === 'event') eventType = value;
  }

  function feed(chunk, final = false) {
    buffer += chunk;
    let match;
    while ((match = buffer.match(/\r\n|\n|\r/))) {
      if (!final && match[0] === '\r' && match.index === buffer.length - 1) break;
      processLine(buffer.slice(0, match.index));
      buffer = buffer.slice(match.index + match[0].length);
    }
    if (final) {
      if (buffer) processLine(buffer);
      buffer = '';
      dispatch();
    }
  }

  return { feed, end: () => feed('', true) };
}

export { createSSEParser };
