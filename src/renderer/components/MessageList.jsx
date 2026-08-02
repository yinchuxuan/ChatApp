import React from 'react';
import { messageKey } from '../chat/messageSelection.js';
import { message, PropTypes } from './componentPropTypes.js';

function MessageBubble({ message, children }) {
  const className = `chat-message ${message.role} ${message.isError ? 'error' : ''}`;
  return <div className={className} data-gc-part="message" style={{ flex: 1, minWidth: 0 }}>
    {children}
  </div>;
}

function MessageRow({ message, retrySource = false, retryButton, children, keyPrefix = 'message' }) {
  const className = `chat-message-row${retrySource ? ' retry-source-row' : ''}${
    message._streaming ? ' streaming-message-row' : ''
  }`;
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
    const streaming = message._streaming === true;
    const content = message.role === 'assistant'
      ? renderAssistant(streaming ? message.content : message, renderIndex, streaming)
      : renderUser(message, renderIndex);
    return <MessageRow key={messageKey(message, `${keyPrefix}-${renderIndex}`)} message={message}
      retrySource={retrySource} keyPrefix={keyPrefix}
      retryButton={message.role === 'user' ? renderRetryButton(retrySource) : null}>
      {content}
    </MessageRow>;
  });
}

MessageBubble.propTypes = { message: message.isRequired, children: PropTypes.node };
MessageRow.propTypes = {
  message: message.isRequired,
  retrySource: PropTypes.bool,
  retryButton: PropTypes.node,
  children: PropTypes.node,
  keyPrefix: PropTypes.string
};
MessageList.propTypes = {
  messages: PropTypes.arrayOf(message).isRequired,
  lastUserIndex: PropTypes.number.isRequired,
  renderUser: PropTypes.func.isRequired,
  renderAssistant: PropTypes.func.isRequired,
  renderRetryButton: PropTypes.func.isRequired,
  keyPrefix: PropTypes.string
};
export { MessageBubble, MessageList, MessageRow };
