import { applyStateAction } from './stateActions.js';
import { cloneState } from './statePaths.js';

const PATCH_PATTERN = /<state_patch>([\s\S]*?)<\/state_patch>/g;

function findLatestAssistantMessage(messages = []) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === 'assistant') return messages[index];
  }
  return null;
}

function extractLatestAssistantStatePatches(messages = []) {
  const message = findLatestAssistantMessage(messages);
  if (!message || typeof message.content !== 'string') return [];
  return [...message.content.matchAll(PATCH_PATTERN)].map((match) => match[1].trim());
}

function normalizePatchActions(parsed) {
  if (Array.isArray(parsed) || !parsed || typeof parsed !== 'object') {
    return Array.isArray(parsed) ? parsed : [parsed];
  }
  if (Object.prototype.hasOwnProperty.call(parsed, 'type')) return [parsed];
  return Object.entries(parsed).map(([path, value]) => ({
    type: 'state.set',
    path,
    value
  }));
}

function summarizeActions(actions) {
  return actions.reduce((keys, action) => {
    (action.summary?.state?.changedKeys || []).forEach((key) => keys.add(key));
    return keys;
  }, new Set());
}

function applyParsedPatch(state, patchText, options) {
  let actions;
  try {
    actions = normalizePatchActions(JSON.parse(patchText));
  } catch (_) {
    return {
      state: cloneState(state),
      trace: { applied: false, reason: 'invalid_json', actions: [], changedKeys: [], setPaths: [] }
    };
  }

  const selectedActions = options.actionFilter
    ? actions.filter(options.actionFilter)
    : actions;
  const result = selectedActions.reduce((current, action) => {
    const applied = applyStateAction(current.state, action, options);
    return {
      state: applied.state,
      actions: [...current.actions, applied.trace]
    };
  }, { state: cloneState(state), actions: [] });

  return {
    state: result.state,
    trace: {
      applied: result.actions.some((action) => action.applied),
      actions: result.actions,
      changedKeys: [...summarizeActions(result.actions)],
      setPaths: selectedActions
        .filter((action, index) => action?.type === 'state.set' && result.actions[index]?.applied)
        .map(action => action.path),
      ignoredPaths: actions
        .filter(action => !selectedActions.includes(action))
        .map(action => action?.path)
        .filter(Boolean)
    }
  };
}

function applyStatePatch(patchText, state = {}, options = {}) {
  return applyParsedPatch(state, patchText, options);
}

function applyLatestAssistantStatePatch(messages = [], state = {}, options = {}) {
  const patches = extractLatestAssistantStatePatches(messages);
  if (patches.length === 0) {
    return {
      state: cloneState(state),
      trace: { applied: false, reason: 'not_found', patches: [], changedKeys: [], setPaths: [] }
    };
  }

  return patches.reduce((current, patchText) => {
    const result = applyParsedPatch(current.state, patchText, options);
    return {
      state: result.state,
      trace: {
        applied: current.trace.applied || result.trace.applied,
        patches: [...current.trace.patches, result.trace],
        changedKeys: [...new Set([...current.trace.changedKeys, ...result.trace.changedKeys])],
        setPaths: [...new Set([...current.trace.setPaths, ...result.trace.setPaths])]
      }
    };
  }, {
    state: cloneState(state),
    trace: { applied: false, patches: [], changedKeys: [], setPaths: [] }
  });
}

export {
  applyLatestAssistantStatePatch,
  applyStatePatch,
  extractLatestAssistantStatePatches
};
