const listeners = new Set();

function dispatchChatInputCommand(command) {
  listeners.forEach(listener => listener(command));
  return listeners.size > 0;
}

function subscribeChatInputCommands(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export { dispatchChatInputCommand, subscribeChatInputCommands };
