// ChatPanel render helpers - Renders Chat history and msg history display
// Used by ChatPanel component

const ChatPanelRenderers = {
  // Render msg history display - array of msgs with role, content, thinking
  renderMsgHistoryDisplay: (R, msgHistoryMessages) => {
    if (!msgHistoryMessages || msgHistoryMessages.length === 0) {
      return R.createElement('div', { className: 'chat-empty' },
        R.createElement('span', { className: 'material-icons empty-icon' }, 'inbox'),
        R.createElement('div', null, '暂无消息历史记录')
      );
    }
    const msgsArray = msgHistoryMessages.map(msg => {
      const result = { role: msg.role, content: msg.content };
      if (msg._thinking) {
        result.thinking = msg._thinking;
      }
      return result;
    });
    const jsonStr = JSON.stringify({ msgs: msgsArray }, null, 2);
    return R.createElement('div', { className: 'msg-history-card' },
      R.createElement('pre', { className: 'msg-history-json' }, jsonStr)
    );
  }
};

// Make available globally for browser environment
if (typeof window !== 'undefined') {
  window.ChatPanelRenderers = ChatPanelRenderers;
}

// CommonJS export for Node.js/test environment (does not affect browser Babel)
module.exports = ChatPanelRenderers;
