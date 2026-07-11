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

function buildBrowserSource(source, isSourceFile) {
  if (isSourceFile) {
    return `${source}\nif (typeof run !== 'function') throw new Error('exec sourceFile must define function run(ctx)');\nreturn run(__ctx);`;
  }
  return `'use strict';\nconst ctx = __ctx;\nconst { messages, state, config, event, utils, files } = ctx;\n${source}`;
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

function runInBrowser(source, context, options) {
  const blocked = /\b(for|while|do|import|require|process|window|document|fetch|ipcRenderer|Function|eval)\b/;
  if (blocked.test(source)) throw new Error('exec source contains blocked browser runtime token');
  return Function(
    '__ctx',
    'require',
    'process',
    'window',
    'document',
    'fetch',
    'ipcRenderer',
    buildBrowserSource(source, options.isSourceFile)
  )(context, undefined, undefined, undefined, undefined, undefined, undefined);
}

function run(source, context, options = {}) {
  const runtimeOptions = { timeoutMs: options.timeoutMs || 50, isSourceFile: !!options.isSourceFile };
  const canUseNodeVm = typeof require === 'function' && typeof process !== 'undefined';
  return canUseNodeVm
    ? runInNode(source, context, runtimeOptions)
    : runInBrowser(source, context, runtimeOptions);
}

const controlledScriptExecutor = { run };

export { controlledScriptExecutor };
