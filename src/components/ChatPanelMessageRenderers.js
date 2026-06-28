// ChatPanelMessageRenderers - Message rendering helpers for ChatPanel
// Extracts render functions to reduce ChatPanel.jsx below 200 lines

const ChatPanelMessageRenderers = {
  handleInputActionClick(e) {
    const target = e.target?.closest?.('[data-gc-chat-input-value], [data-gc-chat-input-value-from], [data-gc-chat-input-label]');
    if (!target) return false;
    const value = this.resolveInputActionValue(target);
    if (!value) return false;
    e.preventDefault();
    e.stopPropagation();
    window.dispatchEvent(new CustomEvent('game-card-chat-input-action', {
      detail: { type: 'chat.input.set', value, focus: true }
    }));
    return true;
  },

  resolveInputActionValue(target) {
    const directValue = target.getAttribute('data-gc-chat-input-value');
    if (directValue) return directValue;
    if (target.getAttribute('data-gc-chat-input-value-from') === 'text') {
      return target.textContent.replace(/\s+/g, ' ').trim();
    }
    const label = target.getAttribute('data-gc-chat-input-label');
    const textSelector = target.getAttribute('data-gc-chat-input-text-selector');
    const text = textSelector ? target.querySelector(textSelector)?.textContent : target.textContent;
    if (!label || !text) return '';
    return `${label}. ${text.replace(/\s+/g, ' ').trim()}`;
  },

  filterDialogueMessages(messages) {
    return (Array.isArray(messages) ? messages : [])
      .map((msg, index) => ({ msg, index: msg?._renderIndex ?? index }))
      .filter(({ msg }) =>
        (['user', 'assistant'].includes(msg?.role) || msg?._meta?.visibility === 'user_visible') &&
        msg?._meta?.visibility !== 'llm_only' &&
        msg?._meta?.visibility !== 'debug_only')
      .map(({ msg, index }) => ({ ...msg, _renderIndex: index }));
  },

  renderMarkdown(R, text, marked, DOMPurify, highlightQuotes) {
    const rawHtml = marked ? marked.parse(text) : text;
    const sanitizedHtml = DOMPurify ? DOMPurify.sanitize(rawHtml) : rawHtml;
    const html = highlightQuotes(sanitizedHtml);
    return R.createElement('div', { className: 'chat-message-bubble', 'data-gc-part': 'message-bubble' },
      R.createElement('div', { className: 'chat-bubble-content', 'data-gc-part': 'message-content', onClick: (e) => this.handleInputActionClick(e), dangerouslySetInnerHTML: { __html: html } })
    );
  },

  renderUserMsg(R, msg, marked, DOMPurify, highlightQuotes, display) {
    const rules = this.getDisplayRules();
    const content = rules?.applyUserDisplayRules
      ? rules.applyUserDisplayRules(msg.content, display)
      : msg.content;
    return this.renderMarkdown(R, content, marked, DOMPurify, highlightQuotes);
  },

  getDisplayRules() {
    if (typeof window !== 'undefined' && window.GameCardDisplayRules) return window.GameCardDisplayRules;
    if (typeof require !== 'undefined') return require('../gameCard/displayRules');
    return null;
  },

  renderAssistantMsg(R, msg, idx, isStreaming, tw, currentThinking, showStreamThinking, setShowStreamThinking, toggleThinkingForMessage, marked, DOMPurify, highlightQuotes, display) {
    const thinking = isStreaming ? currentThinking : msg._thinking;
    const showThinking = isStreaming ? showStreamThinking : (msg._thinkingVisible === true);
    const rawContent = isStreaming ? msg.slice(0, tw.displayedCount) : msg.content;
    const rules = this.getDisplayRules();
    const displayContent = rules ? rules.applyAssistantDisplayRules(rawContent, display) : rawContent;
    const rawHtml = marked ? marked.parse(displayContent) : displayContent;
    const sanitizedHtml = DOMPurify ? DOMPurify.sanitize(rawHtml) : rawHtml;
    const html = highlightQuotes(sanitizedHtml);
    const bubbleClass = thinking ? 'chat-message-bubble bubble-clickable' : 'chat-message-bubble';
    const handleClick = thinking ? () => {
      if (isStreaming) { setShowStreamThinking(p => !p); }
      else { toggleThinkingForMessage(idx); }
    } : null;
    return R.createElement('div', { className: bubbleClass, 'data-gc-part': 'message-bubble', onClick: handleClick },
      thinking && showThinking && R.createElement('div', { className: 'chat-thinking-text', 'data-gc-part': 'message-thinking' }, thinking),
      R.createElement('div', { className: 'chat-bubble-content', 'data-gc-part': 'message-content', onClick: (e) => this.handleInputActionClick(e), dangerouslySetInnerHTML: { __html: html } })
    );
  },

  renderRetryBtn(R, isLast, isLoading, handleRetry) {
    if (!isLast || isLoading) return null;
    return R.createElement('button', {
      className: 'md-btn retry-btn retry-side-indicator', onClick: (e) => { e.stopPropagation(); handleRetry(); },
      title: '重新生成', 'aria-label': '重新生成回复'
    }, R.createElement('span', { className: 'material-icons' }, 'refresh'));
  },

  renderMessages(R, messages, isLoading, tw, currentThinking, showStreamThinking, renderMarkdown, renderAssistantMsg, renderRetryBtn, collapseRenderer, isHistoryExpanded, handleExpandHistory, modelConfig) {
    messages = this.filterDialogueMessages(messages);
    if (messages.length === 0 && !isLoading) {
      if (!modelConfig?.apiUrl) {
        return R.createElement('div', { className: 'chat-empty' },
          R.createElement('span', { className: 'material-icons empty-icon' }, 'question_answer'),
          R.createElement('div', null, '开始对话'),
          R.createElement('div', { className: 'chat-empty-hint' }, '请先配置模型 API')
        );
      }
      return R.createElement('div', { className: 'chat-empty' },
        R.createElement('span', { className: 'material-icons empty-icon' }, 'question_answer'),
        R.createElement('div', null, '开始对话')
      );
    }
    if (collapseRenderer) {
      return collapseRenderer.render(R, messages, isLoading, tw, renderMarkdown, renderAssistantMsg, renderRetryBtn, isHistoryExpanded, handleExpandHistory);
    }

    const lastUserIdx = messages.map((m, i) => m.role === 'user' ? i : -1).filter(i => i >= 0).pop();
    return R.createElement('div', { className: 'chat-messages-layer' },
      messages.map((msg, idx) => {
        const isRetrySource = idx === lastUserIdx;
        const renderIndex = msg._renderIndex ?? idx;
        if (msg.role === 'assistant') {
          return R.createElement('div', { key: idx, className: 'chat-message-row', 'data-gc-part': 'message-row', 'data-role': msg.role },
              R.createElement('div', { className: `chat-message ${msg.role} ${msg.isError ? 'error' : ''}`, 'data-gc-part': 'message', style: { flex: 1, minWidth: 0 } },
              renderAssistantMsg(msg, renderIndex, false)
            )
          );
        }
        return R.createElement('div', { key: idx, className: `chat-message-row${isRetrySource ? ' retry-source-row' : ''}`, 'data-gc-part': 'message-row', 'data-role': msg.role },
          R.createElement('div', { className: `chat-message ${msg.role} ${msg.isError ? 'error' : ''}`, 'data-gc-part': 'message', style: { flex: 1, minWidth: 0 } },
            renderMarkdown(msg.content)
          ),
          renderRetryBtn(isRetrySource, isLoading)
        );
      }),
      isLoading && R.createElement('div', { className: 'chat-message-row streaming-message-row', 'data-gc-part': 'message-row', 'data-role': 'assistant' },
        R.createElement('div', { className: 'chat-message assistant', 'data-gc-part': 'message', style: { flex: 1, minWidth: 0 } },
          renderAssistantMsg(tw.streamContent, messages.length, true)
        )
      )
    );
  }
};

if (typeof window !== 'undefined') {
  window.ChatPanelMessageRenderers = ChatPanelMessageRenderers;
}

module.exports = ChatPanelMessageRenderers;
