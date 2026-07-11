import React from 'react';
import * as displayRules from '../gameCard/displayRules.js';
import { dispatchChatInputCommand } from '../chat/chatInputCommands.js';
import { findLastRoleIndex, selectVisibleMessages } from '../chat/messageSelection.js';
import { MessageList, StreamingMessageRow } from './MessageList.jsx';

function inputActionValue(target) {
  const directValue = target.getAttribute('data-gc-chat-input-value');
  if (directValue) return directValue;
  if (target.getAttribute('data-gc-chat-input-value-from') === 'text') {
    return target.textContent.replace(/\s+/g, ' ').trim();
  }
  const label = target.getAttribute('data-gc-chat-input-label');
  const selector = target.getAttribute('data-gc-chat-input-text-selector');
  const text = selector ? target.querySelector(selector)?.textContent : target.textContent;
  return label && text ? `${label}. ${text.replace(/\s+/g, ' ').trim()}` : '';
}

const ChatPanelMessageRenderers = {
  handleInputActionClick(event) {
    const target = event.target?.closest?.(
      '[data-gc-chat-input-value], [data-gc-chat-input-value-from], [data-gc-chat-input-label]'
    );
    if (!target) return false;
    const value = inputActionValue(target);
    if (!value) return false;
    event.preventDefault();
    event.stopPropagation();
    dispatchChatInputCommand({ type: 'chat.input.set', value, focus: true });
    return true;
  },

  resolveInputActionValue: inputActionValue,

  filterDialogueMessages(messages) {
    return selectVisibleMessages(messages);
  },

  renderMarkdown(_React, text, marked, DOMPurify, highlightQuotes) {
    const rawHtml = marked ? marked.parse(text) : text;
    const sanitizedHtml = DOMPurify ? DOMPurify.sanitize(rawHtml) : rawHtml;
    const html = highlightQuotes(sanitizedHtml);
    return <div className="chat-message-bubble" data-gc-part="message-bubble">
      <div className="chat-bubble-content" data-gc-part="message-content"
        onClick={event => this.handleInputActionClick(event)}
        dangerouslySetInnerHTML={{ __html: html }} />
    </div>;
  },

  renderUserMsg(R, msg, marked, DOMPurify, highlightQuotes, display) {
    const rules = this.getDisplayRules();
    const content = rules?.applyUserDisplayRules
      ? rules.applyUserDisplayRules(msg.content, display)
      : msg.content;
    return this.renderMarkdown(R, content, marked, DOMPurify, highlightQuotes);
  },

  renderEditableUserMsg(R, msg, renderIndex, renderMarkdown, editUserMessage) {
    if (!editUserMessage?.canEdit?.(renderIndex)) return renderMarkdown(msg.content);
    if (editUserMessage.isEditing(renderIndex)) {
      const rows = Math.max(1, String(editUserMessage.content || '').split('\n').length);
      return <div className="chat-message-bubble chat-message-edit-bubble" data-gc-part="message-bubble">
        <textarea className="chat-message-edit-textarea" data-gc-part="message-edit-textarea"
          value={editUserMessage.content} rows={rows} autoFocus aria-label="编辑用户消息"
          onChange={event => editUserMessage.change(event.target.value)}
          onClick={event => event.stopPropagation()}
          onKeyDown={event => { if (event.key === 'Escape') editUserMessage.cancel(); }} />
      </div>;
    }
    const bubble = renderMarkdown(msg.content);
    return R.cloneElement(bubble, {
      className: `${bubble.props.className || ''} chat-message-editable-bubble`,
      onClick: event => { if (!event.defaultPrevented) editUserMessage.start(renderIndex, msg.content); }
    });
  },

  getDisplayRules() {
    return displayRules;
  },

  renderAssistantMsg(_React, msg, idx, isStreaming, tw, currentThinking, showStreamThinking,
    setShowStreamThinking, toggleThinkingForMessage, marked, DOMPurify, highlightQuotes, display) {
    const thinking = isStreaming ? currentThinking : msg._thinking;
    const showThinking = isStreaming ? showStreamThinking : msg._thinkingVisible === true;
    const rawContent = isStreaming ? msg.slice(0, tw.displayedCount) : msg.content;
    const rules = this.getDisplayRules();
    const displayContent = rules?.applyAssistantDisplayRules
      ? rules.applyAssistantDisplayRules(rawContent, display)
      : rawContent;
    const rawHtml = marked ? marked.parse(displayContent) : displayContent;
    const sanitizedHtml = DOMPurify ? DOMPurify.sanitize(rawHtml) : rawHtml;
    const html = highlightQuotes(sanitizedHtml);
    const bubbleClass = thinking ? 'chat-message-bubble bubble-clickable' : 'chat-message-bubble';
    const handleClick = thinking ? () => {
      if (isStreaming) setShowStreamThinking(value => !value);
      else toggleThinkingForMessage(idx);
    } : undefined;
    return <div className={bubbleClass} data-gc-part="message-bubble" onClick={handleClick}>
      {thinking && showThinking ? <div className="chat-thinking-text" data-gc-part="message-thinking">
        {thinking}
      </div> : null}
      <div className="chat-bubble-content" data-gc-part="message-content"
        onClick={event => this.handleInputActionClick(event)}
        dangerouslySetInnerHTML={{ __html: html }} />
    </div>;
  },

  renderRetryBtn(_React, isLast, isLoading, handleRetry) {
    if (!isLast || isLoading) return null;
    return <button className="md-btn retry-btn retry-side-indicator"
      onClick={event => { event.stopPropagation(); handleRetry(); }}
      title="重新生成" aria-label="重新生成回复">
      <span className="material-icons">refresh</span>
    </button>;
  },

  renderMessages(R, messages, isLoading, tw, currentThinking, showStreamThinking, renderMarkdown,
    renderAssistantMsg, renderRetryBtn, collapseRenderer, isHistoryExpanded, handleExpandHistory,
    modelConfig, editUserMessage) {
    const visibleMessages = this.filterDialogueMessages(messages);
    if (visibleMessages.length === 0 && !isLoading) {
      return <div className="chat-empty">
        <span className="material-icons empty-icon">question_answer</span>
        <div>开始对话</div>
        {!modelConfig?.apiUrl ? <div className="chat-empty-hint">请先配置模型 API</div> : null}
      </div>;
    }
    const renderUserMessage = (msg, renderIndex) => (
      this.renderEditableUserMsg(R, msg, renderIndex, renderMarkdown, editUserMessage)
    );
    renderUserMessage.usesMessageObject = true;
    if (collapseRenderer) {
      return collapseRenderer.render(R, visibleMessages, isLoading, tw, renderUserMessage,
        renderAssistantMsg, renderRetryBtn, isHistoryExpanded, handleExpandHistory);
    }
    const lastUserIndex = findLastRoleIndex(visibleMessages, 'user');
    return <div className="chat-messages-layer">
      <MessageList messages={visibleMessages} lastUserIndex={lastUserIndex}
        renderUser={renderUserMessage} renderAssistant={renderAssistantMsg}
        renderRetryButton={retrySource => renderRetryBtn(retrySource, isLoading)} />
      {isLoading ? <StreamingMessageRow
        content={renderAssistantMsg(tw.streamContent, visibleMessages.length, true)} /> : null}
    </div>;
  }
};

export default ChatPanelMessageRenderers;
