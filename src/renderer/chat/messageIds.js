let fallbackSequence = 0;

function createMessageId() {
  if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID();
  fallbackSequence += 1;
  return `message-${Date.now()}-${fallbackSequence}`;
}

function createChatMessage(message) {
  return { id: createMessageId(), ...message };
}

function ensureMessageIds(messages = []) {
  let changed = false;
  const normalized = messages.map(message => {
    if (typeof message?.id === 'string' && message.id) return message;
    changed = true;
    return { ...message, id: createMessageId() };
  });
  return changed ? normalized : messages;
}

export { createChatMessage, createMessageId, ensureMessageIds };
