const { resolveExecSource } = require('./execSource');

function deepClone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object') return value;
  Object.freeze(value);
  Object.keys(value).forEach((key) => deepFreeze(value[key]));
  return value;
}

function createUtils() {
  return deepFreeze({
    clamp: (value, min, max) => Math.min(Math.max(value, min), max),
    randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
    roll: (dice) => {
      const match = String(dice).match(/^(\d*)d(\d+)$/i);
      if (!match) throw new Error('invalid dice expression');
      const count = Number(match[1] || 1);
      const sides = Number(match[2]);
      return Array.from({ length: count }).reduce((sum) => {
        return sum + Math.floor(Math.random() * sides) + 1;
      }, 0);
    },
    uuid: () => {
      const cryptoObj = typeof crypto !== 'undefined' ? crypto : null;
      if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
        const value = Math.floor(Math.random() * 16);
        return (char === 'x' ? value : (value & 0x3) | 0x8).toString(16);
      });
    }
  });
}

function createConfig(card = {}) {
  const config = deepClone(card);
  delete config.rules;
  delete config.state;
  return deepFreeze(config);
}

function validateMessage(message) {
  if (!message || typeof message !== 'object' || Array.isArray(message)) return false;
  if (!['user', 'assistant', 'system'].includes(message.role)) return false;
  if (typeof message.content !== 'string') return false;
  if (message.thinking !== undefined && typeof message.thinking !== 'string') return false;
  if (message.ttl !== undefined && !Number.isInteger(message.ttl)) return false;
  return true;
}

function validateExecResult(result) {
  if (!result || typeof result !== 'object' || Array.isArray(result)) {
    throw new Error('exec must return an object');
  }
  if (result.messages !== undefined) {
    if (!Array.isArray(result.messages) || !result.messages.every(validateMessage)) {
      throw new Error('exec messages must be valid message objects');
    }
  }
  if (result.state !== undefined) {
    if (!result.state || typeof result.state !== 'object' || Array.isArray(result.state)) {
      throw new Error('exec state must be an object');
    }
  }
  const allowed = ['messages', 'state', 'effects'];
  Object.keys(result).forEach((key) => {
    if (!allowed.includes(key)) throw new Error(`exec returned unsupported field: ${key}`);
  });
}

function blockedGlobals() {
  return `
      const require = undefined;
      const process = undefined;
      const window = undefined;
      const document = undefined;
      const fetch = undefined;
      const ipcRenderer = undefined;
  `;
}

function buildInlineSource(source) {
  return `
    (function () {
      'use strict';
      ${blockedGlobals()}
      const ctx = __ctx;
      const { messages, state, config, event, utils } = ctx;
      ${source}
    })()
  `;
}

function buildFileSource(source) {
  return `
    (function () {
      'use strict';
      ${blockedGlobals()}
      ${source}
      if (typeof run !== 'function') throw new Error('exec sourceFile must define function run(ctx)');
      return run(__ctx);
    })()
  `;
}

function buildBrowserSource(source, isSourceFile) {
  if (isSourceFile) return `${source}\nif (typeof run !== 'function') throw new Error('exec sourceFile must define function run(ctx)');\nreturn run(__ctx);`;
  return `'use strict';\nconst ctx = __ctx;\nconst { messages, state, config, event, utils } = ctx;\n${source}`;
}

function runInNodeVm(source, context, timeoutMs, isSourceFile) {
  const globalRequire = require;
  const vmModule = globalRequire('vm');
  const sandbox = { __ctx: context };
  vmModule.createContext(sandbox, {
    codeGeneration: { strings: false, wasm: false }
  });
  const wrappedSource = isSourceFile ? buildFileSource(source) : buildInlineSource(source);
  return vmModule.runInContext(wrappedSource, sandbox, { timeout: timeoutMs });
}

function runInBrowser(source, context, isSourceFile) {
  const blocked = /\b(for|while|do|import|require|process|window|document|fetch|ipcRenderer|Function|eval)\b/;
  if (blocked.test(source)) {
    throw new Error('exec source contains blocked browser runtime token');
  }
  return Function(
    '__ctx',
    'require',
    'process',
    'window',
    'document',
    'fetch',
    'ipcRenderer',
    buildBrowserSource(source, isSourceFile)
  )(context, undefined, undefined, undefined, undefined, undefined, undefined);
}

function summarizeState(before, after) {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
}

function runExecAction(messages, state, action, options = {}) {
  const beforeMessages = deepClone(messages);
  const beforeState = deepClone(state);
  const timeoutMs = options.timeoutMs || 50;
  const context = {
    messages: deepClone(messages),
    state: deepClone(state),
    config: createConfig(options.card),
    event: deepFreeze(deepClone(options.event || {})),
    utils: createUtils()
  };

  const startedAt = Date.now();
  const canUseNodeVm = typeof require === 'function' && typeof process !== 'undefined';
  const source = resolveExecSource(action, options);
  const isSourceFile = typeof action.sourceFile === 'string';
  const result = canUseNodeVm
    ? runInNodeVm(source, context, timeoutMs, isSourceFile)
    : runInBrowser(source, context, isSourceFile);
  validateExecResult(result);

  const nextMessages = result.messages === undefined ? beforeMessages : deepClone(result.messages);
  const nextState = result.state === undefined ? beforeState : deepClone(result.state);
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
      effects: result.effects === undefined ? undefined : deepClone(result.effects),
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { runExecAction, validateExecResult };
}
