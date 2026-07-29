const EVENT_CONTROL_SCRIPT = 'eventControl';

function queueFromState(state) {
  const queue = state && state.events && state.events.queue;
  return Array.isArray(queue) ? queue : [];
}

function panelFromState(state) {
  const panel = state && state.events && state.events.panel;
  if (!panel || typeof panel !== 'object') return { open: false, eventId: '' };
  return {
    open: panel.open === true,
    eventId: typeof panel.eventId === 'string' ? panel.eventId : ''
  };
}

function optionLabel(option, index) {
  if (option && option.label) return String(option.label);
  return index === 0 ? '选择一' : '选择二';
}

function eventTitle(eventItem) {
  return eventItem && eventItem.title ? String(eventItem.title) : '未命名事件';
}

function eventTime(eventItem) {
  if (!eventItem) return '';
  return eventItem.time || eventItem.date || eventItem.occurredAt || '';
}

function eventBodySegments(body) {
  return String(body).split(/(“[^”]*”|‘[^’]*’|「[^」]*」|『[^』]*』|"[^"]*"|'[^']*')/g).filter(Boolean);
}

function isQuotedSegment(segment) {
  return /^(“[\s\S]*”|‘[\s\S]*’|「[\s\S]*」|『[\s\S]*』|"[\s\S]*"|'[\s\S]*')$/.test(segment);
}

function eventBodyParagraphs(body) {
  return String(body).replace(/\r\n/g, '\n').split(/\n{2,}/).map(part => part.trim()).filter(Boolean);
}

function renderTextSegments(C, text, keyPrefix) {
  return eventBodySegments(text).map((segment, index) => (
    isQuotedSegment(segment)
      ? C('span', { key: `${keyPrefix}-${index}`, className: 'quoted-text' }, segment)
      : segment
  ));
}

function renderParagraph(C, paragraph, index) {
  const lines = paragraph.split('\n');
  const children = [];
  lines.forEach((line, lineIndex) => {
    if (lineIndex > 0) children.push(C('br', { key: `${index}-br-${lineIndex}` }));
    children.push(...renderTextSegments(C, line, `${index}-${lineIndex}`));
  });
  return C('p', { key: index }, children);
}

function renderEventBody(C, ui, body) {
  if (ui && typeof ui.renderAssistantMessage === 'function') {
    return ui.renderAssistantMessage(body, {
      rowClassName: 'wa2-event-message-row',
      messageClassName: 'wa2-event-body'
    });
  }
  return C('div', { className: 'wa2-event-message-row chat-message-row', 'data-gc-part': 'message-row', 'data-role': 'assistant' },
    C('div', { className: 'wa2-event-body chat-message assistant', 'data-gc-part': 'message' },
      C('div', { className: 'chat-message-bubble', 'data-gc-part': 'message-bubble' },
        C('div', { className: 'chat-bubble-content', 'data-gc-part': 'message-content' },
          eventBodyParagraphs(body).map((paragraph, index) => renderParagraph(C, paragraph, index))
        )
      )
    )
  );
}

function isRetryEditorTarget(target) {
  return Boolean(target?.closest?.('.wa2-retry-editor'));
}

function isRetryControlTarget(target) {
  return Boolean(target?.closest?.('.wa2-retry-editor, .wa2-retry-action'));
}

function Root({ React, state, emit, ui = {} }) {
  const C = React.createElement;
  const queue = queueFromState(state);
  const panel = panelFromState(state);
  const queuedEvent = queue[0];
  const activeEvent = panel.eventId ? queue.find((item) => item && String(item.id) === panel.eventId) : queuedEvent;
  const eventItem = panel.open ? activeEvent : queuedEvent;
  const options = eventItem && Array.isArray(eventItem.options) ? eventItem.options : [];
  const open = panel.open;
  const contentRef = React.useRef(null);
  const panelRef = React.useRef(null);
  const retryPanelRef = React.useRef(null);
  const rootRef = React.useRef(null);
  const triggerRef = React.useRef(null);
  const wasOpenRef = React.useRef(false);
  const [paused, setPaused] = React.useState(false);
  const [retryContent, setRetryContent] = React.useState('');
  const [retryError, setRetryError] = React.useState('');

  React.useEffect(() => {
    if (open) panelRef.current?.focus();
    else if (wasOpenRef.current) triggerRef.current?.focus();
    wasOpenRef.current = open;
  }, [open]);

  React.useEffect(() => {
    if (paused) retryPanelRef.current?.focus();
  }, [paused]);

  React.useEffect(() => {
    const view = rootRef.current?.ownerDocument?.defaultView;
    if (!view) return undefined;

    function openPause() {
      setRetryContent(String(ui.retrySource || ''));
      setRetryError('');
      setPaused(true);
    }

    function handleKeyDown(event) {
      if (event.defaultPrevented || event.repeat || event.isComposing) return;
      if (paused && event.key === 'Enter' && !isRetryControlTarget(event.target)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      if (event.key !== 'Escape' || open) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (paused) setPaused(false);
      else openPause();
    }

    function handleContextMenu(event) {
      if (open || (paused && isRetryEditorTarget(event.target))) return;
      if (!event.target?.closest?.('[data-gc-part="chat-panel"]')) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (paused) setPaused(false);
      else openPause();
    }

    view.addEventListener('keydown', handleKeyDown, true);
    view.addEventListener('contextmenu', handleContextMenu, true);
    return () => {
      view.removeEventListener('keydown', handleKeyDown, true);
      view.removeEventListener('contextmenu', handleContextMenu, true);
    };
  }, [open, paused, ui.retrySource]);

  function consume(option) {
    emit({
      type: 'game.script.run',
      name: EVENT_CONTROL_SCRIPT,
      payload: {
        action: 'consume',
        eventId: eventItem && eventItem.id ? String(eventItem.id) : '',
        optionId: option && option.id ? String(option.id) : ''
      }
    });
  }

  function togglePanel() {
    emit({
      type: 'game.script.run',
      name: EVENT_CONTROL_SCRIPT,
      payload: { action: open ? 'close' : 'open' }
    });
  }

  function scrollPanel(event) {
    const content = contentRef.current;
    if (!content || event.target.closest?.('.wa2-event-content')) return;
    if (content.scrollHeight <= content.clientHeight) return;
    content.scrollTop += event.deltaY;
  }

  function handlePanelKeyDown(event) {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    togglePanel();
  }

  function closePause(event) {
    event?.stopPropagation();
    setPaused(false);
  }

  function retry(event) {
    event.stopPropagation();
    if (!ui.canRetry || !retryContent.trim()) return;
    const result = emit({ type: 'chat.retry', content: retryContent });
    if (result === false) {
      setRetryError('当前行动暂时无法重新演绎');
      return;
    }
    setPaused(false);
    Promise.resolve(result)
      .then((success) => {
        if (success !== false) return;
        setRetryError('当前行动暂时无法重新演绎');
        setPaused(true);
      })
      .catch(() => {
        setRetryError('重新演绎失败，请稍后再试');
        setPaused(true);
      });
  }

  function renderRetryPanel() {
    if (!paused) return null;
    return C('section', {
      className: 'wa2-retry-layer',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'wa2-retry-title',
      onClick: (event) => event.stopPropagation()
    },
      C('div', {
        className: 'wa2-retry-panel',
        ref: retryPanelRef,
        tabIndex: -1
      },
        C('div', { className: 'wa2-retry-kicker' }, '演出暂停'),
        C('h2', { className: 'wa2-retry-title', id: 'wa2-retry-title' }, '上一次行动'),
        ui.retrySource
          ? C('textarea', {
            className: 'wa2-retry-editor',
            value: retryContent,
            rows: 4,
            'aria-label': '编辑上一次行动',
            onChange: (event) => setRetryContent(event.target.value)
          })
          : C('p', { className: 'wa2-retry-empty' }, '当前没有可以重新演绎的行动。'),
        retryError ? C('p', { className: 'wa2-retry-error', role: 'status' }, retryError) : null,
        C('div', { className: 'wa2-retry-actions' },
          C('button', {
            type: 'button',
            className: 'wa2-retry-action wa2-retry-return',
            onClick: closePause
          }, '返回演出'),
          C('button', {
            type: 'button',
            className: 'wa2-retry-action wa2-retry-submit',
            disabled: !ui.canRetry || !retryContent.trim(),
            onClick: retry
          }, '重新生成')
        )
      )
    );
  }

  function renderEmpty() {
    return C('div', { className: 'wa2-event-empty' },
      C('div', { className: 'material-icons wa2-event-empty-icon', 'aria-hidden': 'true' }, 'inbox'),
      C('div', { className: 'wa2-event-empty-title' }, '当前无事件'),
      C('p', { className: 'wa2-event-empty-text' }, '新的剧情事件出现后，会在这里等待你的选择。')
    );
  }

  function renderEvent() {
    const time = eventTime(eventItem);
    return C('div', { className: 'wa2-event-content', ref: contentRef },
      C('h2', { className: 'wa2-event-title' }, eventTitle(eventItem)),
      time ? C('div', { className: 'wa2-event-time' },
        C('span', { className: 'wa2-event-time-icon', 'aria-hidden': 'true' }),
        C('span', { className: 'wa2-event-time-text' }, String(time))
      ) : null,
      eventItem.body ? renderEventBody(C, ui, eventItem.body) : null,
      C('div', { className: 'wa2-event-options' },
        options.map((option, index) => C('button', {
          key: option && option.id ? String(option.id) : String(index),
          type: 'button',
          className: 'wa2-event-option',
          onClick: () => consume(option)
        },
        C('span', { className: 'wa2-event-option-label' }, optionLabel(option, index)),
        option && option.description ? C('span', { className: 'wa2-event-option-desc' }, String(option.description)) : null))
      )
    );
  }

  const triggerLabel = open ? '返回主剧情' : '打开事件';

  return C('div', {
    className: 'wa2-event-root',
    ref: rootRef,
    'data-open': open ? 'true' : 'false',
    'data-has-events': queue.length > 0 ? 'true' : 'false',
    'data-paused': paused ? 'true' : 'false'
  },
    C('button', {
      type: 'button',
      className: 'wa2-event-trigger',
      ref: triggerRef,
      onClick: togglePanel,
      title: triggerLabel,
      'aria-label': triggerLabel,
      'aria-controls': 'wa2-event-panel',
      'aria-expanded': open ? 'true' : 'false'
    },
    C('span', { className: 'material-icons wa2-event-trigger-icon', 'aria-hidden': 'true' }, open ? 'keyboard_return' : 'inbox')),
    C('section', {
      id: 'wa2-event-panel',
      className: 'wa2-event-panel',
      ref: panelRef,
      role: 'region',
      tabIndex: open ? -1 : undefined,
      'data-visible': open ? 'true' : 'false',
      'aria-label': '事件',
      'aria-hidden': open ? 'false' : 'true',
      onWheel: scrollPanel,
      onKeyDown: handlePanelKeyDown
    },
      open ? (eventItem ? renderEvent() : renderEmpty()) : null
    ),
    renderRetryPanel()
  );
}
