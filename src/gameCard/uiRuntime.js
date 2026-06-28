const UI_ROOT_STYLE_ID = 'game-card-ui-root-style';
const UI_ROOT_SOURCE_PATTERN = /^(?![/\\])(?!.*(?:^|[/\\])\.\.(?:[/\\]|$)).+\.jsx?$/i;
const UI_ROOT_STYLE_PATTERN = /^(?![/\\])(?!.*(?:^|[/\\])\.\.(?:[/\\]|$)).+\.css$/i;

function isSafeUiRootSourcePath(path) {
  return typeof path === 'string' && UI_ROOT_SOURCE_PATTERN.test(path);
}

function isSafeUiRootStylePath(path) {
  return typeof path === 'string' && UI_ROOT_STYLE_PATTERN.test(path);
}

function removeGameCardUiRootStyle(doc = document) {
  const existing = doc.getElementById(UI_ROOT_STYLE_ID);
  if (existing) existing.remove();
}

function normalizeUiRootSource(source) {
  if (/\bimport\s*(?:[\w*{]|['"])/.test(source) || /\brequire\s*\(/.test(source)) {
    throw new Error('ui root source cannot use import or require');
  }
  if (/\b(process|window|document|fetch|ipcRenderer|electronAPI|localStorage|sessionStorage|globalThis|Function|eval)\b/.test(source)) {
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
    'electronAPI',
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

async function loadGameCardUiRoot(card, api, ReactRef) {
  const root = card?.ui?.root;
  if (!card?.id || !root || !isSafeUiRootSourcePath(root.source) || typeof api?.readGameCardFile !== 'function') {
    return null;
  }
  const result = await api.readGameCardFile(card.id, root.source);
  if (!result?.success || !result.content) throw new Error(result?.error || 'failed to read ui root source');
  return {
    Component: compileGameCardUiRootSource(result.content, ReactRef),
    props: root.props || {},
    source: root.source
  };
}

async function loadGameCardUiRootStyle(card, api, doc = document) {
  removeGameCardUiRootStyle(doc);
  const stylePath = card?.ui?.root?.style;
  if (!card?.id || !isSafeUiRootStylePath(stylePath) || typeof api?.readGameCardFile !== 'function') return false;
  const result = await api.readGameCardFile(card.id, stylePath);
  if (!result?.success || !result.content) return false;
  const style = doc.createElement('style');
  style.id = UI_ROOT_STYLE_ID;
  style.dataset.gameCardId = card.id;
  style.dataset.source = stylePath;
  style.textContent = result.content;
  doc.head.appendChild(style);
  return true;
}

if (typeof window !== 'undefined') {
  window.GameCardUiRuntime = {
    compileGameCardUiRootSource,
    isSafeUiRootSourcePath,
    isSafeUiRootStylePath,
    loadGameCardUiRoot,
    loadGameCardUiRootStyle,
    removeGameCardUiRootStyle
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    compileGameCardUiRootSource,
    isSafeUiRootSourcePath,
    isSafeUiRootStylePath,
    loadGameCardUiRoot,
    loadGameCardUiRootStyle,
    removeGameCardUiRootStyle
  };
}
