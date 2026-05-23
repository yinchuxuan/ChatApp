function toCleanMessage(message) {
  return {
    role: message.role,
    content: message.content
  };
}

function getSendableMessages(messages) {
  return (Array.isArray(messages) ? messages : [])
    .filter((message) => message?._meta?.visibility !== 'debug_only')
    .map(toCleanMessage);
}

function adaptOpenAIMessages(messages) {
  return { messages: getSendableMessages(messages) };
}

function adaptAnthropicMessages(messages) {
  const system = [];
  const userMessages = [];

  getSendableMessages(messages).forEach((message) => {
    if (message.role === 'system') {
      system.push(message.content);
    } else {
      userMessages.push(message);
    }
  });

  return {
    messages: userMessages,
    system: system.join('\n\n') || undefined
  };
}

function adaptMessagesToProtocol(messages, protocol = 'openai') {
  if (protocol === 'anthropic') return adaptAnthropicMessages(messages);
  return adaptOpenAIMessages(messages);
}

if (typeof window !== 'undefined') {
  window.adaptMessagesToProtocol = adaptMessagesToProtocol;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { adaptMessagesToProtocol };
}
