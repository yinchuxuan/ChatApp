let fallbackSequence = 0;

function createMessageId() {
  if (typeof crypto?.randomUUID === 'function') return crypto.randomUUID();
  fallbackSequence += 1;
  return `message-${Date.now()}-${fallbackSequence}`;
}

function createChatMessage(message) {
  return { id: createMessageId(), ...message };
}

export { createChatMessage, createMessageId };
