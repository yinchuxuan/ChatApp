function normalizeUrl(url) {
  return url.replace(/\/+$/, '').replace(/\/v1$/, '');
}

function getOpenAIParams(config) {
  return window.buildOpenAIParams ? window.buildOpenAIParams(config) : {};
}

function getAnthropicParams(config) {
  return window.buildAnthropicParams ? window.buildAnthropicParams(config) : {};
}

function buildOpenAIRequest(config) {
  const { apiUrl, apiKey, modelName, messages } = config;
  const adapted = adaptMessagesForRequest(messages, 'openai');
  return {
    url: `${normalizeUrl(apiUrl)}/v1/chat/completions`,
    options: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelName || 'gpt-3.5-turbo',
        messages: adapted.messages,
        stream: true,
        ...getOpenAIParams(config)
      })
    }
  };
}

function buildAnthropicRequest(config) {
  const { apiUrl, apiKey, modelName, messages } = config;
  const adapted = adaptMessagesForRequest(messages, 'anthropic');
  const body = {
    model: modelName || 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    messages: adapted.messages,
    stream: true,
    ...getAnthropicParams(config)
  };
  if (adapted.system) body.system = adapted.system;

  return {
    url: `${normalizeUrl(apiUrl)}/v1/messages`,
    options: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    }
  };
}

function adaptMessagesForRequest(messages, protocol) {
  if (typeof window !== 'undefined' && window.adaptMessagesToProtocol) {
    return window.adaptMessagesToProtocol(messages, protocol);
  }
  if (typeof require !== 'undefined') {
    try {
      return require('../gameCard/protocolAdapter').adaptMessagesToProtocol(messages, protocol);
    } catch (_) { /* use fallback */ }
  }
  return { messages: Array.isArray(messages) ? messages : [] };
}

function buildRequest(config) {
  const protocol = config.protocol || 'openai';
  const builder = protocol === 'anthropic' ? buildAnthropicRequest : buildOpenAIRequest;
  return { protocol, ...builder(config) };
}

function parseOpenAIChunk(parsed, callbacks) {
  const choice = parsed.choices?.[0]?.delta;
  if (choice?.reasoning_content && callbacks.onThinkingToken) {
    callbacks.onThinkingToken(choice.reasoning_content);
  }
  if (choice?.content && callbacks.onToken) {
    callbacks.onToken(choice.content);
  }
}

function parseAnthropicChunk(parsed, callbacks) {
  if (parsed.type === 'content_block_delta') {
    if (parsed.delta?.type === 'text_delta' && parsed.delta?.text && callbacks.onToken) {
      callbacks.onToken(parsed.delta.text);
    } else if (parsed.delta?.type === 'thinking_delta' && parsed.delta?.thinking && callbacks.onThinkingToken) {
      callbacks.onThinkingToken(parsed.delta.thinking);
    }
  }
}

function parseSSEEvent(eventText, protocol, callbacks) {
  const lines = eventText.split('\n');
  const dataParts = [];
  for (const line of lines) {
    if (line.startsWith('data:')) {
      dataParts.push(line.slice(5).replace(/^ /, ''));
    }
  }
  if (dataParts.length === 0) return;
  const data = dataParts.join('');
  if (data === '[DONE]') return;
  try {
    const parsed = JSON.parse(data);
    if (protocol === 'anthropic') {
      parseAnthropicChunk(parsed, callbacks);
    } else {
      parseOpenAIChunk(parsed, callbacks);
    }
  } catch (_) { /* skip unparseable lines */ }
}

async function readSSEStream(reader, protocol, callbacks) {
  const decoder = new TextDecoder();
  let buffer = '';

  if (protocol === 'anthropic') {
    // Anthropic SSE: events delimited by \n\n, each event has event: and data: lines
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';
      for (const event of events) {
        if (event.trim()) {
          parseSSEEvent(event.trim(), protocol, callbacks);
        }
      }
    }
    if (buffer.trim()) {
      parseSSEEvent(buffer.trim(), protocol, callbacks);
    }
  } else {
    // OpenAI SSE: events are individual data: lines, separated by \n
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).replace(/^ /, '');
        if (data === '[DONE]') continue;
        try {
          parseOpenAIChunk(JSON.parse(data), callbacks);
        } catch (_) { /* skip unparseable lines */ }
      }
    }
  }
}

async function sendChatRequest(config, callbacks) {
  const { url, options, protocol } = buildRequest(config);
  const response = await fetch(url, options);

  if (!response.ok) {
    let errorMsg = `API 错误: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMsg = errorData?.error?.message || errorMsg;
    } catch (_) { /* use default error */ }
    throw new Error(errorMsg);
  }

  const reader = response.body.getReader();
  try {
    await readSSEStream(reader, protocol, callbacks);
  } finally {
    reader.releaseLock();
  }
}

// Make available globally for browser environment
if (typeof window !== 'undefined') {
  window.sendChatRequest = sendChatRequest;
}

export { sendChatRequest };
