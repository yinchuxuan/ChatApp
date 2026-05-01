// ChatPanel render helpers - Renders Chat history and msg history display
// Used by ChatPanel component

const ChatPanelRenderers = {
  // Render msg history display - shows only the msg JSON structure
  renderMsgHistoryDisplay: (R, msgHistoryMessages) => {
    if (!msgHistoryMessages || msgHistoryMessages.length === 0) {
      return R.createElement('div', null, '暂无消息历史记录');
    }
    const messageElements = msgHistoryMessages.map((msg, idx) =>
      R.createElement('pre', { key: idx, className: 'chat-msg-history-json' },
        JSON.stringify(msg, null, 2)
      )
    );
    return R.createElement('div', null, ...messageElements);
  }
};

// Make available globally for browser environment
if (typeof window !== 'undefined') {
  window.ChatPanelRenderers = ChatPanelRenderers;
}

// CommonJS export for Node.js/test environment (does not affect browser Babel)
module.exports = ChatPanelRenderers;
