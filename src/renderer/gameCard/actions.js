import {
  applyAction as applyCoreAction,
  applyActions as applyCoreActions
} from '../../shared/game-card/engine/actions.js';
import { runExecAction } from './execRunner.js';
import { withPlatformFileReader } from './platformFileReader.js';

function prepareOptions(options = {}) {
  const prepared = withPlatformFileReader(options);
  if (typeof prepared.runExecAction === 'function') return prepared;
  return {
    ...prepared,
    runExecAction: (messages, state, action, coreOptions) => (
      runExecAction(messages, state, action, { ...coreOptions, ...options })
    )
  };
}

function applyAction(messages, action, options = {}) {
  return applyCoreAction(messages, action, prepareOptions(options));
}

function applyActions(messages, actions = [], options = {}) {
  return applyCoreActions(messages, actions, prepareOptions(options));
}

export { applyAction, applyActions };
