// MessageCollapseRenderer - Renders collapsed/pinned message view
// Last user message is pinned; earlier messages are collapsed; drag down to expand with progress indicator

const MessageCollapseRenderer = {
  dragProgress: 0,

  findLastUserIndex(messages) {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') return i;
    }
    return -1;
  },

  _updateProgress(progress) {
    this.dragProgress = progress;
    const bar = document.querySelector('.collapsed-history-progress-bar');
    if (bar) {
      bar.style.width = (progress * 100) + '%';
    }
    // Animate collapsed history section sliding down
    const collapsed = document.querySelector('.collapsed-history');
    if (collapsed) {
      collapsed.style.maxHeight = (progress * 400) + 'px';
      collapsed.style.opacity = progress;
      collapsed.style.transform = `translateY(${(1 - progress) * -20}px)`;
    }
    // Shift pinned section down to make room
    const pinnedDivider = document.querySelector('.pinned-divider');
    if (pinnedDivider) {
      pinnedDivider.style.transform = `translateY(${progress * -10}px)`;
      const view = pinnedDivider.closest('.collapsed-message-view');
      if (view) {
        const afterPinned = view.querySelectorAll('.chat-message[class*="pinned"]');
        afterPinned.forEach(el => {
          el.style.transform = `translateY(${progress * -10}px)`;
        });
      }
    }
  },

  _cleanupDrag() {
    this.dragProgress = 0;
    const bar = document.querySelector('.collapsed-history-progress-bar');
    if (bar) {
      bar.style.width = '0%';
    }
    // Reset transforms on drag end
    const collapsed = document.querySelector('.collapsed-history');
    if (collapsed) {
      collapsed.style.maxHeight = '';
      collapsed.style.opacity = '';
      collapsed.style.transform = '';
    }
    const pinnedDivider = document.querySelector('.pinned-divider');
    if (pinnedDivider) {
      pinnedDivider.style.transform = '';
      const view = pinnedDivider.closest('.collapsed-message-view');
      if (view) {
        const afterPinned = view.querySelectorAll('.chat-message[class*="pinned"]');
        afterPinned.forEach(el => {
          el.style.transform = '';
        });
      }
    }
  },

  render(R, messages, isLoading, tw, renderMarkdown, renderAssistantMsg,
         isHistoryExpanded, onExpand) {
    if (messages.length === 0 && !isLoading) {
      return null; // caller renders empty state
    }

    const lastUserIdx = this.findLastUserIndex(messages);
    const collapsedCount = lastUserIdx >= 0 ? lastUserIdx : 0;
    const isCollapsed = !isHistoryExpanded && messages.length > 1 && lastUserIdx >= 0;

    const elements = [];

    // Collapsed history section (above pinned message)
    if (isCollapsed) {
      const collapsedMsgs = messages.slice(0, collapsedCount);
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
          R.createElement('div', { key: 'hist-' + i, className: `chat-message ${msg.role} ${msg.isError ? 'error' : ''}` },
            msg.role === 'assistant' && msg._thinking
              ? renderAssistantMsg(msg, i, false)
              : renderMarkdown(msg.content)
          )
        );
      }
    }

    // Pinned section (divider)
    if (lastUserIdx >= 0) {
      elements.push(
        R.createElement('div', { key: 'pinned-divider', className: 'pinned-divider' })
      );
    }

    // Pinned message + messages after it + streaming response
    const startIdx = lastUserIdx >= 0 ? lastUserIdx : 0;
    for (let i = startIdx; i < messages.length; i++) {
      const msg = messages[i];
      elements.push(
        R.createElement('div', { key: 'pinned-' + i, className: `chat-message ${msg.role} ${msg.isError ? 'error' : ''}` },
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

    // Drag-to-expand with visual progress
    const dragThreshold = 60; // pixels of downward drag to trigger expand
    const onMouseDown = (e) => {
      if (e.button !== 0 || isHistoryExpanded) return;
      const startY = e.clientY;
      const onMove = (ev) => {
        const distance = ev.clientY - startY;
        if (distance > 0) {
          MessageCollapseRenderer._updateProgress(Math.min(distance / dragThreshold, 1));
        }
        if (distance >= dragThreshold) {
          if (onExpand) onExpand();
          MessageCollapseRenderer._cleanupDrag();
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
        }
      };
      const onUp = () => {
        MessageCollapseRenderer._cleanupDrag();
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    };

    // Scroll-to-expand fallback
    const onWheel = (e) => {
      if (!isHistoryExpanded && e.deltaY > 0) {
        if (onExpand) onExpand();
        e.preventDefault();
      }
    };

    return R.createElement('div', {
      className: `collapsed-message-view${isHistoryExpanded ? ' expanded' : ''}`,
      onMouseDown: onMouseDown,
      onWheel: onWheel
    }, elements);
  }
};

if (typeof window !== 'undefined') {
  window.MessageCollapseRenderer = MessageCollapseRenderer;
}

module.exports = MessageCollapseRenderer;
