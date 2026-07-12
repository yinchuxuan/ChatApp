function validateMessage(message) {
  if (!message || typeof message !== 'object' || Array.isArray(message)) return false;
  if (!['user', 'assistant', 'system'].includes(message.role)) return false;
  if (typeof message.content !== 'string') return false;
  if (message.thinking !== undefined && typeof message.thinking !== 'string') return false;
  if (message.ttl !== undefined && !Number.isInteger(message.ttl)) return false;
  return true;
}

function validateExecResult(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new Error('exec must return an object');
  }
  if (result.messages !== undefined) {
    if (!Array.isArray(result.messages) || !result.messages.every(validateMessage)) {
      throw new Error('exec messages must be valid message objects');
    }
  }
  if (result.state !== undefined) {
    if (!result.state || typeof result.state !== 'object' || Array.isArray(result.state)) {
      throw new Error('exec state must be an object');
    }
  }
  const allowed = ['messages', 'state', 'effects'];
  Object.keys(result).forEach((key) => {
    if (!allowed.includes(key)) throw new Error(`exec returned unsupported field: ${key}`);
  });
}

export { validateExecResult, validateMessage };
