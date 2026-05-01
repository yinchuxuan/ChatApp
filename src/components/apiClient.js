// apiClient - API Client with OpenAI/Anthropic protocol support
// Auto-detects protocol from URL and routes to the correct API format

function detectProtocol(apiUrl) {
  if (!apiUrl) return 'openai';
  return apiUrl.toLowerCase().includes('anthropic') ? 'anthropic' : 'openai';
}

function buildOpenAIRequest({ apiUrl, apiKey, modelName, messages }) {
  return {
    url: `${apiUrl}/chat/completions`,
    options: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelName || 'gpt-3.5-turbo',
        messages,
        stream: true
      })
    }
  };
}

function buildAnthropicRequest({ apiUrl, apiKey, modelName, messages }) {
  return {
    url: `${apiUrl}/messages`,
    options: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: modelName || 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages,
        stream: true
      })
    }
  };
}

function buildRequest(config) {
  const protocol = detectProtocol(config.apiUrl);
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
    if (line.startsWith('data: ')) {
      dataParts.push(line.slice(6));
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
        if (!trimmed || !trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
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
      if (protocol === 'anthropic') {
        errorMsg = errorData?.error?.message || errorMsg;
      } else {
        errorMsg = errorData?.error?.message || errorMsg;
      }
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
  window.detectProtocol = detectProtocol;
  window.sendChatRequest = sendChatRequest;
}

export { detectProtocol, sendChatRequest };
