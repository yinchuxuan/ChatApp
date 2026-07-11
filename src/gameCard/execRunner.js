import { createExecContext, cloneJson } from '../../shared/game-card/exec/execContext.js';
import { validateExecResult } from '../../shared/game-card/exec/execResult.js';
import { controlledScriptExecutor } from '../platform/controlledScriptExecutor.js';
import { createExecFiles } from './execFiles.js';
import { resolveExecSource } from './execSource.js';

function summarizeState(before, after) {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
}

function runExecAction(messages, state, action, options = {}) {
  const beforeMessages = cloneJson(messages);
  const beforeState = cloneJson(state);
  const timeoutMs = options.timeoutMs || 50;
  const context = createExecContext({
    messages,
    state,
    card: options.card,
    event: options.event,
    files: createExecFiles(options, state),
    random: options.random,
    randomUuid: options.randomUuid
  });
  const source = resolveExecSource(action, options);
  const scriptExecutor = options.scriptExecutor || controlledScriptExecutor;
  const startedAt = Date.now();
  const result = scriptExecutor.run(source, context, {
    timeoutMs,
    isSourceFile: typeof action.sourceFile === 'string'
  });
  validateExecResult(result);

  const nextMessages = result.messages === undefined ? beforeMessages : cloneJson(result.messages);
  const nextState = result.state === undefined ? beforeState : cloneJson(result.state);
  return {
    messages: nextMessages,
    state: nextState,
    trace: {
      type: 'exec',
      sourceFile: action.sourceFile,
      applied: true,
      matched: 1,
      timeoutMs,
      durationMs: Date.now() - startedAt,
      effects: result.effects === undefined ? undefined : cloneJson(result.effects),
      summary: {
        messages: {
          before: beforeMessages.length,
          after: nextMessages.length,
          inserted: Math.max(nextMessages.length - beforeMessages.length, 0),
          removed: Math.max(beforeMessages.length - nextMessages.length, 0),
          replaced: 0
        },
        state: { changedKeys: summarizeState(beforeState, nextState) }
      }
    }
  };
}

export { runExecAction, validateExecResult };
