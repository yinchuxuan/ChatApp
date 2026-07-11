const http = require('node:http');

function openAiStream(content) {
  const chunks = content.split(/(?=\s)/);
  const events = chunks.map(chunk => {
    const payload = JSON.stringify({ choices: [{ delta: { content: chunk } }] });
    return `data: ${payload}\n\n`;
  });
  return `${events.join('')}data: [DONE]\n\n`;
}

function anthropicStream(content) {
  const chunks = content.split(/(?=\s)/).map(chunk => (
    `event: content_block_delta\ndata: ${JSON.stringify({
      type: 'content_block_delta',
      index: 0,
      delta: { type: 'text_delta', text: chunk }
    })}\n\n`
  ));
  return chunks.join('');
}

class StreamServer {
  constructor() {
    this.requests = [];
    this.responses = [];
    this.server = null;
    this.url = '';
  }

  async start() {
    this.server = http.createServer((request, response) => {
      let raw = '';
      request.on('data', chunk => { raw += chunk; });
      request.on('end', () => this.respond(response, raw));
    });
    await new Promise(resolve => this.server.listen(0, '127.0.0.1', resolve));
    this.url = `http://127.0.0.1:${this.server.address().port}/v1`;
    return this;
  }

  respond(response, raw) {
    let body;
    try { body = JSON.parse(raw); } catch { body = raw; }
    this.requests.push(body);
    const next = this.responses.shift() || { body: openAiStream('ok') };
    response.writeHead(next.status || 200, {
      'content-type': next.contentType || 'text/event-stream'
    });
    if (next.hold) {
      response.write(next.body || openAiStream('waiting'));
      return;
    }
    response.end(next.body || openAiStream('ok'));
  }

  queueOpenAi(content, options = {}) {
    this.responses.push({ ...options, body: openAiStream(content) });
  }

  queueAnthropic(content, options = {}) {
    this.responses.push({ ...options, body: anthropicStream(content) });
  }

  reset() {
    this.requests.length = 0;
    this.responses.length = 0;
  }

  async close() {
    this.server.closeAllConnections();
    await new Promise(resolve => this.server.close(resolve));
  }
}

module.exports = { StreamServer, anthropicStream, openAiStream };
