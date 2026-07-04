const WA2_AFFECTION_PATHS = ['setsuna.affection', 'touma.affection'];

function readPath(source, path) {
  return path.split('.').reduce((target, key) => (target ? target[key] : undefined), source);
}

function clampAffection(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(100, Math.max(0, number));
}

function queueFromState(state) {
  const queue = state && state.events && state.events.queue;
  return Array.isArray(queue) ? queue : [];
}

function optionEffects(option) {
  return option && option.effects && typeof option.effects === 'object' && !Array.isArray(option.effects)
    ? option.effects
    : {};
}

function buildEffectActions(state, option) {
  const effects = optionEffects(option);
  return WA2_AFFECTION_PATHS.reduce((actions, path) => {
    const delta = Number(effects[path]);
    if (!Number.isFinite(delta) || delta === 0) return actions;
    const current = clampAffection(readPath(state, path));
    return [...actions, { type: 'state.set', path, value: clampAffection(current + delta) }];
  }, []);
}

function buildConsumeActions(state, queue, option) {
  return [
    ...buildEffectActions(state, option),
    { type: 'state.set', path: 'events.queue', value: queue.slice(1) }
  ];
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

function Root({ React, state, emit }) {
  const C = React.createElement;
  const queue = queueFromState(state);
  const eventItem = queue[0];
  const eventId = eventItem && eventItem.id ? String(eventItem.id) : '';
  const options = eventItem && Array.isArray(eventItem.options) ? eventItem.options : [];
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setOpen(false);
  }, [eventId]);

  function consume(option) {
    const result = emit({
      type: 'game.state.apply',
      actions: buildConsumeActions(state, queue, option)
    });
    if (result && typeof result.then === 'function') result.then((applied) => { if (applied) setOpen(false); });
    else setOpen(false);
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
    return C('div', { className: 'wa2-event-content' },
      C('h2', { className: 'wa2-event-title' }, eventTitle(eventItem)),
      time ? C('div', { className: 'wa2-event-time' },
        C('span', { className: 'wa2-event-time-icon', 'aria-hidden': 'true' }),
        C('span', { className: 'wa2-event-time-text' }, String(time))
      ) : null,
      eventItem.body ? C('p', { className: 'wa2-event-body' }, String(eventItem.body)) : null,
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

  return C('div', {
    className: 'wa2-event-root',
    'data-open': open ? 'true' : 'false',
    'data-has-events': queue.length > 0 ? 'true' : 'false'
  },
    C('button', {
      type: 'button',
      className: 'wa2-event-trigger',
      onClick: () => setOpen((value) => !value),
      'aria-label': open ? '关闭事件' : '打开事件',
      'aria-pressed': open ? 'true' : 'false'
    },
    C('span', { className: 'material-icons wa2-event-trigger-icon', 'aria-hidden': 'true' }, 'inbox'),
    C('span', { className: 'wa2-event-trigger-text' }, '事件')),
    open ? C('section', { className: 'wa2-event-panel', 'aria-label': '事件' },
      eventItem ? renderEvent() : renderEmpty()
    ) : null
  );
}
