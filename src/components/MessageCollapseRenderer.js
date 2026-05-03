// MessageCollapseRenderer - Renders collapsed/pinned message view
// Last user message is pinned; earlier messages are collapsed; drag down to expand with visual feedback

const MessageCollapseRenderer = {

  findLastUserIndex(messages) {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') return i;
    }
    return -1;
  },

  _createDragProps(dragThreshold, isHistoryExpanded, onExpand) {
    return {
      onMouseDown: (e) => {
        if (e.nativeEvent) e.nativeEvent.preventDefault();
        if (e.button !== 0 || isHistoryExpanded) return;
        const startY = e.clientY;
        const el = e.currentTarget;
        let expanded = false;

        const onMove = (ev) => {
          const distance = ev.clientY - startY;
          const progress = Math.min(Math.max(distance / dragThreshold, 0), 1);

          const collapsed = el.querySelector('.collapsed-history');
          if (collapsed) {
            collapsed.style.maxHeight = (progress * 500) + 'px';
            collapsed.style.opacity = String(progress);
          }

          const els = el.querySelectorAll('.chat-message, .pinned-divider');
          els.forEach(function(item) {
            item.style.transform = 'translateY(' + (progress * 16) + 'px)';
          });

          if (distance >= dragThreshold && !expanded) {
            expanded = true;
            if (onExpand) onExpand();
          }
        };

        const onUp = () => {
          const collapsed = el.querySelector('.collapsed-history');
          if (collapsed && !expanded) {
            collapsed.style.transition = 'max-height 0.3s cubic-bezier(0.2, 0, 0, 1), opacity 0.3s ease';
            collapsed.style.maxHeight = '0px';
            collapsed.style.opacity = '0';
            setTimeout(function() { if (collapsed) collapsed.style.transition = ''; }, 300);
          }

          const els = el.querySelectorAll('.chat-message, .pinned-divider');
          els.forEach(function(item) {
            item.style.transition = 'transform 0.3s cubic-bezier(0.2, 0, 0, 1)';
            if (!expanded) {
              item.style.transform = 'translateY(0)';
            }
            setTimeout(function() { if (item) item.style.transition = ''; }, 300);
          });

          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      },
      style: { cursor: isHistoryExpanded ? 'default' : 'grab' }
    };
  },

  render(R, messages, isLoading, tw, renderMarkdown, renderAssistantMsg,
         isHistoryExpanded, onExpand) {
    if (messages.length === 0 && !isLoading) {
      return null;
    }

    const lastUserIdx = this.findLastUserIndex(messages);
    const isCollapsed = !isHistoryExpanded && messages.length > 1 && lastUserIdx >= 0;
    const dragThreshold = 60;

    const elements = [];

    // Collapsed history section (above pinned message)
    if (isCollapsed) {
      const collapsedMsgs = messages.slice(0, lastUserIdx);
      if (collapsedMsgs.length > 0) {
        elements.push(
          R.createElement('div', {
            key: 'collapsed-history',
            className: 'collapsed-history'
          },
            R.createElement('div', { className: 'collapsed-history-indicator' },
              R.createElement('div', { className: 'collapsed-history-progress-bar' }),
              R.createElement('span', { className: 'material-icons' }, 'expand_more'),
              R.createElement('span', null, collapsedMsgs.length + ' 条更早的消息')
            )
          )
        );
      }
    } else if (lastUserIdx >= 0) {
      for (let i = 0; i < lastUserIdx; i++) {
        const msg = messages[i];
        elements.push(
          R.createElement('div', { key: 'hist-' + i, className: 'chat-message ' + msg.role + (msg.isError ? ' error' : '') },
            msg.role === 'assistant' && msg._thinking
              ? renderAssistantMsg(msg, i, false)
              : renderMarkdown(msg.content)
          )
        );
      }
    }

    // Pinned divider
    if (lastUserIdx >= 0) {
      elements.push(
        R.createElement('div', { key: 'pinned-divider', className: 'pinned-divider' })
      );
    }

    // Pinned messages
    const startIdx = lastUserIdx >= 0 ? lastUserIdx : 0;
    for (let i = startIdx; i < messages.length; i++) {
      const msg = messages[i];
      elements.push(
        R.createElement('div', { key: 'pinned-' + i, className: 'chat-message ' + msg.role + (msg.isError ? ' error' : '') },
          msg.role === 'assistant' && msg._thinking
            ? renderAssistantMsg(msg, i, false)
            : renderMarkdown(msg.content)
        )
      );
    }

    // Streaming response
    if (isLoading) {
      elements.push(
        R.createElement('div', { key: 'streaming', className: 'chat-message assistant' },
          renderAssistantMsg(tw.streamContent, messages.length, true)
        )
      );
    }

    const onWheel = (e) => {
      if (!isHistoryExpanded && e.deltaY > 0) {
        if (onExpand) onExpand();
        e.preventDefault();
      }
    };

    const props = {
      className: 'collapsed-message-view' + (isHistoryExpanded ? ' expanded' : ''),
      onWheel: onWheel
    };

    if (!isHistoryExpanded) {
      Object.assign(props, this._createDragProps(dragThreshold, isHistoryExpanded, onExpand));
    }

    return R.createElement('div', props, elements);
  }
};

if (typeof window !== 'undefined') {
  window.MessageCollapseRenderer = MessageCollapseRenderer;
}

module.exports = MessageCollapseRenderer;
