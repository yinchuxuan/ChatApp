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

function Root({ React, state, emit, ui }) {
  const C = React.createElement;
  const queue = queueFromState(state);
  const panel = panelFromState(state);
  const queuedEvent = queue[0];
  const activeEvent = panel.eventId ? queue.find((item) => item && String(item.id) === panel.eventId) : queuedEvent;
  const eventItem = panel.open ? activeEvent : queuedEvent;
  const options = eventItem && Array.isArray(eventItem.options) ? eventItem.options : [];
  const open = panel.open;
  const contentRef = React.useRef(null);

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
    'data-open': open ? 'true' : 'false',
    'data-has-events': queue.length > 0 ? 'true' : 'false'
  },
    C('button', {
      type: 'button',
      className: 'wa2-event-trigger',
      onClick: togglePanel,
      title: triggerLabel,
      'aria-label': triggerLabel,
      'aria-controls': 'wa2-event-panel',
      'aria-pressed': open ? 'true' : 'false'
    },
    C('span', { className: 'material-icons wa2-event-trigger-icon', 'aria-hidden': 'true' }, open ? 'keyboard_return' : 'inbox')),
    C('section', {
      id: 'wa2-event-panel',
      className: 'wa2-event-panel',
      'data-visible': open ? 'true' : 'false',
      'aria-label': '事件',
      'aria-hidden': open ? 'false' : 'true',
      onWheel: scrollPanel
    },
      eventItem ? renderEvent() : renderEmpty()
    )
  );
}
