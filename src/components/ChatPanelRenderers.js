// ChatPanel render helpers - Renders Chat history and msg history display
// Used by ChatPanel component

const ChatPanelRenderers = {
  // Render msg history display - single rectangular card with msgs JSON
  renderMsgHistoryDisplay: (R, msgHistoryMessages) => {
    if (!msgHistoryMessages || msgHistoryMessages.length === 0) {
      return R.createElement('div', null, '暂无消息历史记录');
    }
    const msgsObj = {};
    msgHistoryMessages.forEach((msg, idx) => {
      msgsObj[idx] = { ...msg };
    });
    const jsonStr = JSON.stringify({ msgs: msgsObj }, null, 2);
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
