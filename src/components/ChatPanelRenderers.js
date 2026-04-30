// ChatPanel render helpers - Renders Chat history and API request display
// Used by ChatPanel component

const ChatPanelRenderers = {
  // Render API request display
  renderApiRequestDisplay: (R, lastApiRequestMessages) => {
    if (lastApiRequestMessages && lastApiRequestMessages.length > 0) {
      return R.createElement('div', { className: 'chat-api-request-display' },
        R.createElement('div', { className: 'chat-api-request-header' },
          R.createElement('span', { className: 'material-icons' }, 'api'),
          R.createElement('span', null, '最后一次 API 请求消息')
        ),
        R.createElement('pre', { className: 'chat-api-request-content' },
          JSON.stringify(lastApiRequestMessages, null, 2)
        )
      );
    }
    return R.createElement('div', { className: 'chat-empty' },
      R.createElement('span', { className: 'material-icons empty-icon' }, 'api'),
      R.createElement('div', null, '暂无 API 请求历史'),
      R.createElement('div', { className: 'chat-empty-hint' }, '发送消息后将显示 API 请求内容')
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
