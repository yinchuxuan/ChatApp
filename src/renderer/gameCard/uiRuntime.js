import { readCachedCardText } from './gameCardRuntimeCache.js';

const UI_ROOT_SOURCE_PATTERN = /^(?![/\\])(?!.*(?:^|[/\\])\.\.(?:[/\\]|$)).+\.jsx?$/i;

function isSafeUiRootSourcePath(path) {
  return typeof path === 'string' && UI_ROOT_SOURCE_PATTERN.test(path);
}

function normalizeUiRootSource(source) {
  if (/\bimport\s*(?:[\w*{]|['"])/.test(source) || /\brequire\s*\(/.test(source)) {
    throw new Error('ui root source cannot use import or require');
  }
  if (/\b(process|window|document|fetch|ipcRenderer|localStorage|sessionStorage|globalThis|Function|eval)\b/.test(source)) {
    throw new Error('ui root source contains blocked browser runtime token');
  }
  const defaultNames = [];
  let code = source.replace(/export\s+default\s+function\s+([A-Za-z_$][\w$]*)\s*\(/g, (_, name) => {
    defaultNames.push(name);
    return `function ${name}(`;
  });
  code = code.replace(/export\s+default\s+function\s*\(/g, 'module.exports.default = function (');
  code = code.replace(/export\s+default\s+([A-Za-z_$][\w$]*)\s*;?/g, 'module.exports.default = $1;');
  code = code.replace(/export\s*\{\s*([A-Za-z_$][\w$]*)\s+as\s+default\s*\}\s*;?/g, 'module.exports.default = $1;');
  code = code.replace(/export\s+(function|const|let|var)\s+/g, '$1 ');
  if (defaultNames.length) {
    code += `\nmodule.exports.default = module.exports.default || ${defaultNames[defaultNames.length - 1]};`;
  }
  return code;
}

function isReactComponent(value) {
  return typeof value === 'function' || (!!value && typeof value === 'object' && value.$$typeof);
}

function pickComponent(result) {
  const candidates = [
    result.moduleExport?.default,
    result.moduleExport?.Root,
    result.exportsValue?.default,
    result.exportsValue?.Root,
    result.namedRoot,
    result.moduleExport
  ];
  return candidates.find(isReactComponent);
}

function compileGameCardUiRootSource(source, ReactRef) {
  if (typeof source !== 'string' || !source.trim()) throw new Error('ui root source is empty');
  const moduleObj = { exports: {} };
  const exportsObj = moduleObj.exports;
  const code = normalizeUiRootSource(source);
  const factory = Function(
    'React',
    'module',
    'exports',
    'require',
    'process',
    'window',
    'document',
    'fetch',
    'ipcRenderer',
    'localStorage',
    'sessionStorage',
    'globalThis',
    `
      'use strict';
      ${code}
      return {
        moduleExport: module.exports,
        exportsValue: exports,
        namedRoot: typeof Root === 'undefined' ? undefined : Root
      };
    `
  );
  const component = pickComponent(factory(ReactRef, moduleObj, exportsObj));
  if (!component) throw new Error('ui root source must export or define a React component named Root');
  return component;
}

async function loadGameCardUiRoot(card, resources, ReactRef) {
  const root = card?.ui?.root;
  if (!card?.id || !root || !isSafeUiRootSourcePath(root.source) || typeof resources?.readText !== 'function') {
    return null;
  }
  const content = await readCachedCardText(card, resources, root.source);
  if (!content) throw new Error('failed to read ui root source');
  return {
    Component: compileGameCardUiRootSource(content, ReactRef),
    props: root.props || {},
    source: root.source
  };
}

export {
  compileGameCardUiRootSource,
  isSafeUiRootSourcePath,
  loadGameCardUiRoot
};
