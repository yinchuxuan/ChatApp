import { getExecFileEntries } from '../gameCard/execFiles.js';
import { scriptWorkerSource } from './scriptWorkerSource.js';

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

function buildNodeSource(source, isSourceFile) {
  if (isSourceFile) {
    return `(function () {
      'use strict';
      ${blockedGlobals()}
      ${source}
      if (typeof run !== 'function') throw new Error('exec sourceFile must define function run(ctx)');
      return run(__ctx);
    })()`;
  }
  return `(function () {
    'use strict';
    ${blockedGlobals()}
    const ctx = __ctx;
    const { messages, state, config, event, utils, files } = ctx;
    ${source}
  })()`;
}

function runInNode(source, context, options) {
  const globalRequire = require;
  const vm = globalRequire('vm');
  const sandbox = { __ctx: context };
  vm.createContext(sandbox, { codeGeneration: { strings: false, wasm: false } });
  return vm.runInContext(buildNodeSource(source, options.isSourceFile), sandbox, {
    timeout: options.timeoutMs
  });
}

function createBrowserWorker() {
  const url = URL.createObjectURL(new Blob([scriptWorkerSource], { type: 'text/javascript' }));
  return { worker: new Worker(url), release: () => URL.revokeObjectURL(url) };
}

function serializableContext(context) {
  const { messages, state, config, event } = context;
  return { messages, state, config, event };
}

function runInBrowser(source, context, options) {
  const blocked = /\b(Function|eval)\b/;
  if (blocked.test(source)) return Promise.reject(new Error('exec source contains blocked browser runtime token'));
  const created = (options.workerFactory || createBrowserWorker)();
  const worker = created.worker || created;
  const release = created.release || (() => {});
  return new Promise((resolve, reject) => {
    const finish = (callback, value) => {
      clearTimeout(timer);
      worker.terminate();
      release();
      callback(value);
    };
    const timer = setTimeout(() => finish(reject, new Error('Script execution timed out')), options.timeoutMs);
    worker.onmessage = ({ data }) => data.error
      ? finish(reject, new Error(data.error))
      : finish(resolve, data.result);
    worker.onerror = (event) => finish(reject, new Error(event.message || 'Script worker failed'));
    worker.postMessage({
      source,
      isSourceFile: options.isSourceFile,
      context: serializableContext(context),
      files: getExecFileEntries(context.files)
    });
  });
}

function run(source, context, options = {}) {
  const runtimeOptions = {
    timeoutMs: options.timeoutMs || 50,
    isSourceFile: !!options.isSourceFile,
    workerFactory: options.workerFactory
  };
  const canUseNodeVm = typeof require === 'function' && typeof process !== 'undefined';
  return canUseNodeVm
    ? runInNode(source, context, runtimeOptions)
    : runInBrowser(source, context, runtimeOptions);
}

const controlledScriptExecutor = { run };

export { controlledScriptExecutor, runInBrowser };
