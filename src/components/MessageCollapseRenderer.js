// MessageCollapseRenderer - Renders collapsed/pinned message view
// Last user message is pinned; earlier messages are collapsed; drag-down expands

const MessageCollapseRenderer = {
  findLastUserIndex(messages) {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') return i;
    }
    return -1;
  },

  render(R, messages, isLoading, tw, renderMarkdown, renderAssistantMsg,
         isHistoryExpanded, onExpand) {
    if (messages.length === 0 && !isLoading) {
      return null; // caller renders empty state
    }

    const lastUserIdx = this.findLastUserIndex(messages);
    const collapsedCount = lastUserIdx >= 0 ? lastUserIdx : 0;
    const isCollapsed = !isHistoryExpanded && messages.length > 1 && lastUserIdx >= 0;

    const elements = [];

    // Collapsed history section (above pinned message)
    if (isCollapsed) {
      const collapsedMsgs = messages.slice(0, collapsedCount);
      if (collapsedMsgs.length > 0) {
        elements.push(
          R.createElement('div', {
            key: 'collapsed-history',
            className: 'collapsed-history'
          },
            R.createElement('div', { className: 'collapsed-history-indicator' },
              R.createElement('span', { className: 'material-icons' }, 'expand_more'),
              R.createElement('span', null, collapsedMsgs.length + ' 条更早的消息')
            )
          )
        );
      }
    } else if (lastUserIdx >= 0) {
      // Expanded: render all prior messages
      for (let i = 0; i < lastUserIdx; i++) {
        const msg = messages[i];
        elements.push(
          R.createElement('div', { key: 'hist-' + i, className: `chat-message ${msg.role} ${msg.isError ? 'error' : ''}` },
            msg.role === 'assistant' && msg._thinking
              ? renderAssistantMsg(msg, i, false)
              : renderMarkdown(msg.content)
          )
        );
      }
    }

    // Pinned section (divider)
    if (lastUserIdx >= 0) {
      elements.push(
        R.createElement('div', { key: 'pinned-divider', className: 'pinned-divider' })
      );
    }

    // Pinned message + messages after it + streaming response
    const startIdx = lastUserIdx >= 0 ? lastUserIdx : 0;
    for (let i = startIdx; i < messages.length; i++) {
      const msg = messages[i];
      elements.push(
        R.createElement('div', { key: 'pinned-' + i, className: `chat-message ${msg.role} ${msg.isError ? 'error' : ''}` },
          msg.role === 'assistant' && msg._thinking
            ? renderAssistantMsg(msg, i, false)
            : renderMarkdown(msg.content)
        )
      );
    }

    // Streaming response
    if (isLoading) {
      elements.push(
        R.createElement('div', { key: 'streaming', className: 'chat-message assistant' },
          renderAssistantMsg(tw.streamContent, messages.length, true)
        )
      );
    }

    // Drag-to-expand handlers
    const dragThreshold = 10; // pixels of downward drag to trigger expand
    const onMouseDown = (e) => {
      if (e.button !== 0 || isHistoryExpanded) return;
      const startY = e.clientY;
      const onMove = (ev) => {
        if (ev.clientY - startY > dragThreshold) {
          if (onExpand) onExpand();
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
        }
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };

    return R.createElement('div', {
      className: `collapsed-message-view${isHistoryExpanded ? ' expanded' : ''}`,
      onMouseDown: onMouseDown
    }, elements);
  }
};

if (typeof window !== 'undefined') {
  window.MessageCollapseRenderer = MessageCollapseRenderer;
}

module.exports = MessageCollapseRenderer;
