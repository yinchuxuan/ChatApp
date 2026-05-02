// MessageCollapseRenderer - Renders collapsed/pinned message view
// Last user message is pinned; earlier messages are collapsed; drag down to expand with visual feedback

const MessageCollapseRenderer = {

  findLastUserIndex(messages) {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') return i;
    }
    return -1;
  },

  _handleDrag(container, dragThreshold, onExpand) {
    return (e) => {
      if (e.button !== 0) return;
      const startY = e.clientY;
      let expanded = false;

      const onMove = (ev) => {
        const distance = ev.clientY - startY;
        const progress = Math.min(Math.max(distance / dragThreshold, 0), 1);

        // Animate collapsed history sliding open during drag
        const collapsed = container.querySelector('.collapsed-history');
        if (collapsed) {
          collapsed.style.maxHeight = (progress * 500) + 'px';
          collapsed.style.opacity = progress;
        }

        // Shift all chat messages and divider down together
        const els = container.querySelectorAll('.chat-message, .pinned-divider');
        els.forEach(el => {
          el.style.transform = 'translateY(' + (progress * 16) + 'px)';
        });

        if (distance >= dragThreshold && !expanded) {
          expanded = true;
          if (onExpand) onExpand();
        }
      };

      const onUp = () => {
        const collapsed = container.querySelector('.collapsed-history');
        if (collapsed && !expanded) {
          collapsed.style.transition = 'max-height 0.3s cubic-bezier(0.2, 0, 0, 1), opacity 0.3s ease';
          collapsed.style.maxHeight = '0px';
          collapsed.style.opacity = '0';
          setTimeout(() => { collapsed.style.transition = ''; }, 300);
        }

        const els = container.querySelectorAll('.chat-message, .pinned-divider');
        els.forEach(el => {
          el.style.transition = 'transform 0.3s cubic-bezier(0.2, 0, 0, 1)';
          if (!expanded) {
            el.style.transform = 'translateY(0)';
          }
          setTimeout(() => { el.style.transition = ''; }, 300);
        });

        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };
  },

  render(R, messages, isLoading, tw, renderMarkdown, renderAssistantMsg,
         isHistoryExpanded, onExpand) {
    if (messages.length === 0 && !isLoading) {
      return null; // caller renders empty state
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
      // Expanded: render all prior messages
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

    // Pinned message + messages after it
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

    // Drag handler via ref callback
    const refCallback = (el) => {
      if (!el || isHistoryExpanded) return;
      el.onmousedown = MessageCollapseRenderer._handleDrag(el, dragThreshold, onExpand);
    };

    const onWheel = (e) => {
      if (!isHistoryExpanded && e.deltaY > 0) {
        if (onExpand) onExpand();
        e.preventDefault();
      }
    };

    return R.createElement('div', {
      className: 'collapsed-message-view' + (isHistoryExpanded ? ' expanded' : ''),
      ref: refCallback,
      onWheel: onWheel
    }, elements);
  }
};

if (typeof window !== 'undefined') {
  window.MessageCollapseRenderer = MessageCollapseRenderer;
}

module.exports = MessageCollapseRenderer;
