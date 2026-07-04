const { applyStateAction } = require('./stateActions');
const { expandCardImports } = require('./cardImportExpander');
const { loadExternalStateSchema } = require('./stateSchemaLoader');

const MAX_UI_STATE_ACTIONS = 50;

function cloneJson(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function fail(reason, state, extra = {}) {
  return {
    applied: false,
    state: cloneJson(state || {}),
    trace: { type: 'game.state.apply', applied: false, reason, actions: [], changedKeys: [], ...extra }
  };
}

function normalizeUiStateActions(event) {
  if (event?.type !== 'game.state.apply') return { ok: false, reason: 'unsupported_event' };
  const rawActions = Array.isArray(event.actions)
    ? event.actions
    : (isObject(event.action) ? [event.action] : []);
  if (rawActions.length === 0) return { ok: false, reason: 'missing_actions' };
  if (rawActions.length > MAX_UI_STATE_ACTIONS) return { ok: false, reason: 'too_many_actions' };
  const invalid = rawActions.find((action) => !isObject(action) || !String(action.type || '').startsWith('state.'));
  if (invalid) return { ok: false, reason: 'unsupported_action' };
  return { ok: true, actions: cloneJson(rawActions) };
}

async function loadUiStateActionCard(card, api) {
  if (!card) return null;
  const expandedCard = await expandCardImports(card, api);
  return loadExternalStateSchema(expandedCard, api);
}

async function applyUiStateActionEvent({ event, state = {}, messages = [], card = null, api = null } = {}) {
  const normalized = normalizeUiStateActions(event);
  if (!normalized.ok) return fail(normalized.reason, state);

  let runtimeCard;
  try {
    runtimeCard = await loadUiStateActionCard(card, api);
  } catch (error) {
    return fail('load_card_failed', state, { error: error.message });
  }

  const schema = runtimeCard?.state?.schema;
  const result = normalized.actions.reduce((current, action) => {
    const applied = applyStateAction(current.state, action, { messages, schema });
    return {
      state: applied.state,
      actions: [...current.actions, applied.trace]
    };
  }, { state: cloneJson(state || {}), actions: [] });
  const changedKeys = result.actions.reduce((keys, actionTrace) => {
    (actionTrace.summary?.state?.changedKeys || []).forEach((key) => keys.add(key));
    return keys;
  }, new Set());

  return {
    applied: result.actions.some((actionTrace) => actionTrace.applied),
    state: result.state,
    card: runtimeCard,
    trace: {
      type: 'game.state.apply',
      applied: result.actions.some((actionTrace) => actionTrace.applied),
      actions: result.actions,
      changedKeys: [...changedKeys]
    }
  };
}

if (typeof window !== 'undefined') {
  window.GameCardUiStateActions = { applyUiStateActionEvent, normalizeUiStateActions };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { applyUiStateActionEvent, normalizeUiStateActions };
}
