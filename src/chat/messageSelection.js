function selectVisibleMessages(messages) {
  return (Array.isArray(messages) ? messages : [])
    .map((message, index) => ({ message, index: message?._renderIndex ?? index }))
    .filter(({ message }) => {
      const visibility = message?._meta?.visibility;
      const visibleRole = ['user', 'assistant'].includes(message?.role) || visibility === 'user_visible';
      return visibleRole && visibility !== 'llm_only' && visibility !== 'debug_only';
    })
    .map(({ message, index }) => ({ ...message, _renderIndex: index }));
}

function findLastRoleIndex(messages, role) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === role) return index;
  }
  return -1;
}

function messageKey(message, fallback) {
  return message.id || message._id || message._meta?.messageId || fallback;
}

export { findLastRoleIndex, messageKey, selectVisibleMessages };
