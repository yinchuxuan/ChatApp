/* eslint-disable no-unused-vars */

const EVENT_AFFECTION_PATHS = ['setsuna.affection', 'touma.affection'];

function eventReadPath(source, path) {
  return path.split('.').reduce((target, key) => (target ? target[key] : undefined), source);
}

function eventWritePath(state, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  let target = state;
  keys.forEach((key) => {
    if (!target[key] || typeof target[key] !== 'object') target[key] = {};
    target = target[key];
  });
  target[last] = value;
}

function eventDeletePath(state, path) {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((value, key) => (value ? value[key] : undefined), state);
  if (target && typeof target === 'object') delete target[last];
}

function eventQueue(state) {
  return Array.isArray(state.events && state.events.queue) ? state.events.queue : [];
}

function eventClosedPanel() {
  return { open: false, eventId: '', returnScene: { background: null, bgm: null } };
}

function eventPanel(state) {
  const panel = state.events && state.events.panel;
  return panel && typeof panel === 'object' ? panel : eventClosedPanel();
}

function eventSceneValue(state, path) {
  const value = eventReadPath(state, path);
  return typeof value === 'string' && value ? value : null;
}

function eventRestoreScene(state, panel) {
  const scene = panel.returnScene && typeof panel.returnScene === 'object' ? panel.returnScene : {};
  ['background', 'bgm'].forEach((key) => {
    const path = key === 'background' ? 'visual.background' : 'audio.bgm';
    if (typeof scene[key] === 'string' && scene[key]) eventWritePath(state, path, scene[key]);
    else eventDeletePath(state, path);
  });
}

function eventClose(state) {
  const panel = eventPanel(state);
  if (panel.open !== true) return;
  eventRestoreScene(state, panel);
  eventWritePath(state, 'events.panel', eventClosedPanel());
}

function eventOpen(state) {
  if (eventPanel(state).open === true) return;
  const item = eventQueue(state)[0];
  eventWritePath(state, 'events.panel', {
    open: true,
    eventId: item && item.id ? String(item.id) : '',
    returnScene: {
      background: eventSceneValue(state, 'visual.background'),
      bgm: eventSceneValue(state, 'audio.bgm')
    }
  });
  if (item && item.background) eventWritePath(state, 'visual.background', String(item.background));
  if (item && item.bgm) eventWritePath(state, 'audio.bgm', String(item.bgm));
}

function eventClampAffection(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.min(100, Math.max(0, number));
}

function eventApplyOption(state, option) {
  const effects = option.effects && typeof option.effects === 'object' && !Array.isArray(option.effects)
    ? option.effects
    : {};
  EVENT_AFFECTION_PATHS.forEach((path) => {
    const delta = Number(effects[path]);
    if (!Number.isFinite(delta) || delta === 0) return;
    const current = eventClampAffection(eventReadPath(state, path));
    eventWritePath(state, path, eventClampAffection(current + delta));
  });
}

function eventConsume(state, payload) {
  const panel = eventPanel(state);
  if (panel.open !== true || !panel.eventId || String(payload.eventId || '') !== String(panel.eventId)) return;
  const queue = eventQueue(state);
  const item = queue.find((candidate) => candidate && String(candidate.id) === String(panel.eventId));
  const option = item && Array.isArray(item.options)
    ? item.options.find((candidate) => candidate && String(candidate.id) === String(payload.optionId || ''))
    : null;
  if (!item || !option) return;
  eventApplyOption(state, option);
  state.events.queue = queue.filter((candidate) => candidate && String(candidate.id) !== String(panel.eventId));
  eventClose(state);
}

function run(ctx) {
  const payload = ctx.event && ctx.event.payload ? ctx.event.payload : {};
  if (payload.action === 'open') eventOpen(ctx.state);
  else if (payload.action === 'close') eventClose(ctx.state);
  else if (payload.action === 'consume') eventConsume(ctx.state, payload);
  return { state: ctx.state };
}
