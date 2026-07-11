import React from 'react';
import { messageKey } from '../chat/messageSelection.js';

function MessageBubble({ message, children }) {
  const className = `chat-message ${message.role} ${message.isError ? 'error' : ''}`;
  return <div className={className} data-gc-part="message" style={{ flex: 1, minWidth: 0 }}>
    {children}
  </div>;
}

function MessageRow({ message, retrySource = false, retryButton, children, keyPrefix = 'message' }) {
  const className = `chat-message-row${retrySource ? ' retry-source-row' : ''}`;
  return <div className={className} data-gc-part="message-row" data-role={message.role}
    data-message-key={messageKey(message, `${keyPrefix}-${message._renderIndex}`)}>
    <MessageBubble message={message}>{children}</MessageBubble>
    {retryButton || null}
  </div>;
}

function MessageList({ messages, lastUserIndex, renderUser, renderAssistant, renderRetryButton, keyPrefix = 'message' }) {
  return messages.map((message, index) => {
    const renderIndex = message._renderIndex ?? index;
    const retrySource = index === lastUserIndex;
    const content = message.role === 'assistant'
      ? renderAssistant(message, renderIndex, false)
      : renderUser(message, renderIndex);
    return <MessageRow key={messageKey(message, `${keyPrefix}-${renderIndex}`)} message={message}
      retrySource={retrySource} keyPrefix={keyPrefix}
      retryButton={message.role === 'user' ? renderRetryButton(retrySource) : null}>
      {content}
    </MessageRow>;
  });
}

function StreamingMessageRow({ content }) {
  const message = { role: 'assistant' };
  return <div className="chat-message-row streaming-message-row" data-gc-part="message-row" data-role="assistant">
    <MessageBubble message={message}>{content}</MessageBubble>
  </div>;
}

export { MessageBubble, MessageList, MessageRow, StreamingMessageRow };
