// MessageCollapseRenderer - Renders collapsed/pinned message view
// Last user message is pinned; earlier messages are collapsed; scroll-up expands with pull animation

const PULL_THRESHOLD = 60;
const PULL_RESISTANCE = 0.4;
const MAX_PULL = 120;

let pullOffset = 0;
let pullPhase = 'none';
let pullAccum = 0;
let pullTimer = null;
let onExpandRef = null;

function setPullOffset(v) { pullOffset = v; }
function setPullPhase(v) { pullPhase = v; }

function handleWheelCollapse(e, _onExpand) {
  if (pullPhase === 'snapping') return;
  e.preventDefault();
  clearTimeout(pullTimer);
  if (e.deltaY < 0) {
    pullAccum += Math.abs(e.deltaY) * 0.5;
    setPullPhase('dragging');
    setPullOffset(Math.min(pullAccum * PULL_RESISTANCE, MAX_PULL));
  }
  pullTimer = setTimeout(() => {
    if (pullAccum * PULL_RESISTANCE >= PULL_THRESHOLD) {
      if (onExpandRef) onExpandRef();
      setPullPhase('none');
      setPullOffset(0);
      pullAccum = 0;
    } else if (pullAccum > 0) {
      setPullPhase('snapping');
      setPullOffset(0);
      setTimeout(() => { setPullPhase('none'); pullAccum = 0; }, 200);
    }
  }, 100);
}

function resetPull() {
  pullOffset = 0;
  pullPhase = 'none';
  pullAccum = 0;
  clearTimeout(pullTimer);
}

function filterDialogueMessages(messages) {
  return (Array.isArray(messages) ? messages : []).filter(msg => ['user', 'assistant'].includes(msg?.role));
}

const MessageCollapseRenderer = {
  findLastAssistantIndex(messages) {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return i;
    }
    return -1;
  },

  findLastUserIndex(messages) {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') return i;
    }
    return -1;
  },

  resetPull: resetPull,

  render(R, messages, isLoading, tw, renderMarkdown, renderAssistantMsg, renderRetryBtn,
         isHistoryExpanded, onExpand) {
    messages = filterDialogueMessages(messages);
    if (messages.length === 0 && !isLoading) {
      return null;
    }

    onExpandRef = onExpand;

    if (isHistoryExpanded) {
      resetPull();
    }

    const lastUserIdx = this.findLastUserIndex(messages);
    const collapsedCount = lastUserIdx >= 0 ? lastUserIdx : 0;
    const isCollapsed = !isHistoryExpanded && messages.length > 1 && lastUserIdx >= 0;

    const elements = [];

    if (isCollapsed) {
      const collapsedMsgs = messages.slice(0, collapsedCount);
      if (collapsedMsgs.length > 0) {
        elements.push(
          R.createElement('div', {
            key: 'collapsed-history',
            className: 'collapsed-history'
          },
            R.createElement('div', { className: 'collapsed-history-indicator' },
              R.createElement('span', { className: 'material-icons' }, 'expand_more'),
              R.createElement('span', null, `${collapsedMsgs.length} 条更早的消息`)
            )
          )
        );
      }
    } else if (lastUserIdx >= 0) {
      for (let i = 0; i < lastUserIdx; i++) {
        const msg = messages[i];
        if (msg.role === 'assistant') {
          elements.push(
            R.createElement('div', { key: 'hist-' + i, className: 'chat-message-row' },
              R.createElement('div', { className: `chat-message ${msg.role} ${msg.isError ? 'error' : ''}`, style: { flex: 1, minWidth: 0 } },
                msg._thinking ? renderAssistantMsg(msg, i, false) : renderMarkdown(msg.content)
              )
            )
          );
        } else {
          elements.push(
            R.createElement('div', { key: 'hist-' + i, className: 'chat-message-row' },
              R.createElement('div', { className: `chat-message ${msg.role} ${msg.isError ? 'error' : ''}`, style: { flex: 1, minWidth: 0 } },
                renderMarkdown(msg.content)
              )
            )
          );
        }
      }
    }

    if (lastUserIdx >= 0) {
      elements.push(
        R.createElement('div', { key: 'pinned-divider', className: 'pinned-divider' })
      );
    }

    const startIdx = lastUserIdx >= 0 ? lastUserIdx : 0;
    for (let i = startIdx; i < messages.length; i++) {
      const msg = messages[i];
      const isRetrySource = i === lastUserIdx;
      if (msg.role === 'assistant') {
        elements.push(
          R.createElement('div', { key: 'pinned-' + i, className: 'chat-message-row' },
            R.createElement('div', { className: `chat-message ${msg.role} ${msg.isError ? 'error' : ''}`, style: { flex: 1, minWidth: 0 } },
              msg._thinking ? renderAssistantMsg(msg, i, false, false) : renderMarkdown(msg.content)
            )
          )
        );
      } else {
        elements.push(
          R.createElement('div', { key: 'pinned-' + i, className: `chat-message-row${isRetrySource ? ' retry-source-row' : ''}` },
            R.createElement('div', { className: `chat-message ${msg.role} ${msg.isError ? 'error' : ''}`, style: { flex: 1, minWidth: 0 } },
              renderMarkdown(msg.content)
            ),
            renderRetryBtn(isRetrySource, isLoading)
          )
        );
      }
    }

    if (isLoading) {
      elements.push(
        R.createElement('div', { key: 'streaming', className: 'chat-message-row streaming-message-row' },
          R.createElement('div', { className: 'chat-message assistant', style: { flex: 1, minWidth: 0 } },
            renderAssistantMsg(tw.streamContent, messages.length, true)
          )
        )
      );
    }

    const isPulling = pullOffset > 0 && pullPhase !== 'none';
    const wrapperStyle = isPulling ? {
      transform: 'translateY(' + pullOffset + 'px)',
      transition: pullPhase === 'dragging' ? 'none' : 'transform 200ms cubic-bezier(0.05, 0.7, 0.1, 1)'
    } : {};

    const onWheel = (e) => {
      if (!isHistoryExpanded) {
        handleWheelCollapse(e, onExpand);
        e.stopPropagation();
      }
    };

    return R.createElement('div', {
      className: `collapsed-message-view${isHistoryExpanded ? ' expanded' : ''}`,
      onWheel: onWheel
    },
      R.createElement('div', { className: 'collapse-inner-wrapper', style: wrapperStyle }, elements)
    );
  }
};

if (typeof window !== 'undefined') {
  window.MessageCollapseRenderer = MessageCollapseRenderer;
}

module.exports = MessageCollapseRenderer;
