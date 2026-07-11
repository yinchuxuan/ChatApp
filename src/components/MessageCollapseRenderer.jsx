import React from 'react';
import { findLastRoleIndex, selectVisibleMessages } from '../chat/messageSelection.js';
import { MessageList, StreamingMessageRow } from './MessageList.jsx';
import useCollapsedHistory from './useCollapsedHistory.js';

function renderUser(renderer, message, index) {
  return renderer.usesMessageObject ? renderer(message, index) : renderer(message.content);
}

function CollapsedMessageList({ messages, isLoading, typewriter, renderUserMessage,
  renderAssistantMessage, renderRetryButton, isExpanded, onExpand }) {
  const pull = useCollapsedHistory(isExpanded, onExpand);
  const lastUserIndex = findLastRoleIndex(messages, 'user');
  const collapsed = !isExpanded && messages.length > 1 && lastUserIndex >= 0;
  const before = collapsed ? [] : messages.slice(0, Math.max(lastUserIndex, 0));
  const pinned = messages.slice(Math.max(lastUserIndex, 0));
  const renderUserItem = (message, index) => renderUser(renderUserMessage, message, index);
  const retry = isRetrySource => renderRetryButton(isRetrySource, isLoading);

  return <div className={`collapsed-message-view${isExpanded ? ' expanded' : ''}`}
    data-gc-part="collapsed-message-view" onWheel={pull.onWheel}>
    <div className="collapse-inner-wrapper" data-gc-part="message-list" style={pull.style}>
      {collapsed && lastUserIndex > 0 ? <div className="collapsed-history">
        <div className="collapsed-history-indicator">
          <span className="material-icons">expand_more</span>
          <span>{lastUserIndex} 条更早的消息</span>
        </div>
      </div> : null}
      <MessageList messages={before} lastUserIndex={-1} renderUser={renderUserItem}
        renderAssistant={renderAssistantMessage} renderRetryButton={() => null} keyPrefix="history" />
      {lastUserIndex >= 0 ? <div className="pinned-divider" /> : null}
      <MessageList messages={pinned} lastUserIndex={lastUserIndex >= 0 ? 0 : -1}
        renderUser={renderUserItem} renderAssistant={renderAssistantMessage}
        renderRetryButton={retry} keyPrefix="pinned" />
      {isLoading ? <StreamingMessageRow content={renderAssistantMessage(typewriter.streamContent, messages.length, true)} /> : null}
    </div>
  </div>;
}

const MessageCollapseRenderer = {
  findLastAssistantIndex: messages => findLastRoleIndex(messages, 'assistant'),
  findLastUserIndex: messages => findLastRoleIndex(messages, 'user'),
  resetPull() {},
  render(R, rawMessages, isLoading, typewriter, renderUserMessage, renderAssistantMessage,
    renderRetryButton, isExpanded, onExpand) {
    const messages = selectVisibleMessages(rawMessages);
    if (messages.length === 0 && !isLoading) return null;
    return R.createElement(CollapsedMessageList, {
      messages, isLoading, typewriter, renderUserMessage, renderAssistantMessage,
      renderRetryButton, isExpanded, onExpand
    });
  }
};

export default MessageCollapseRenderer;
