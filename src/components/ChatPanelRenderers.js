// ChatPanel render helpers - Renders Chat history and msg history display
// Used by ChatPanel component

const ChatPanelRenderers = {
  // Render msg history display - reads msg JSON structures from history file
  renderMsgHistoryDisplay: (R, msgHistoryMessages) => {
    if (!msgHistoryMessages || msgHistoryMessages.length === 0) {
      return R.createElement('div', { className: 'chat-empty' },
        R.createElement('span', { className: 'material-icons empty-icon' }, 'history'),
        R.createElement('div', null, '暂无消息历史记录'),
        R.createElement('div', { className: 'chat-empty-hint' }, '发送消息后消息将自动保存到文件')
      );
    }
    const messageElements = msgHistoryMessages.map((msg, idx) =>
      R.createElement('div', { key: idx, className: 'chat-msg-history-item' },
        R.createElement('div', { className: 'chat-msg-history-item-header' },
          R.createElement('span', { className: 'material-icons' }, msg.role === 'user' ? 'person' : 'smart_toy'),
          R.createElement('span', null, `消息 #${idx + 1} (${msg.role})`)
        ),
        R.createElement('pre', { className: 'chat-msg-history-content' },
          JSON.stringify(msg, null, 2)
        )
      )
    );
    return R.createElement('div', { className: 'chat-msg-history-display' },
      R.createElement('div', { className: 'chat-msg-history-header' },
        R.createElement('span', { className: 'material-icons' }, 'history'),
        R.createElement('span', null, `消息历史记录 (${msgHistoryMessages.length} 条消息)`)
      ),
      R.createElement('div', { className: 'chat-msg-history-list' },
        ...messageElements
      )
    );
  },

  // Render Chat history
  renderChatHistory: (R, messages, isLoading, modelConfig) => {
    if (messages.length === 0 && !isLoading) {
      return R.createElement('div', { className: 'chat-empty' },
        R.createElement('span', { className: 'material-icons empty-icon' }, 'question_answer'),
        R.createElement('div', null, '开始对话'),
        !modelConfig?.apiUrl && R.createElement('div', { className: 'chat-empty-hint' }, '请先配置模型 API')
      );
    }
    return R.createElement(R.Fragment, null,
      messages.map((msg, idx) =>
        R.createElement('div', {
          key: idx,
          className: `chat-message ${msg.role} ${msg.isError ? 'error' : ''}`
        },
          R.createElement('div', { className: 'chat-avatar' },
            R.createElement('span', { className: 'material-icons' }, msg.role === 'user' ? 'person' : 'smart_toy')
          ),
          R.createElement('div', { className: 'chat-message-bubble md-card' }, msg.content)
        )
      ),
      isLoading && R.createElement('div', { className: 'chat-message assistant' },
        R.createElement('div', { className: 'chat-avatar' },
          R.createElement('span', { className: 'material-icons' }, 'smart_toy')
        ),
        R.createElement('div', { className: 'chat-message-bubble md-card chat-thinking' },
          R.createElement('div', { className: 'chat-thinking-indicator' },
            R.createElement('span', { className: 'material-icons rotating' }, 'refresh'),
            R.createElement('span', null, '模型正在思考...')
          )
        )
      )
    );
  }
};

// Make available globally for browser environment
if (typeof window !== 'undefined') {
  window.ChatPanelRenderers = ChatPanelRenderers;
}

// CommonJS export for Node.js/test environment (does not affect browser Babel)
module.exports = ChatPanelRenderers;
