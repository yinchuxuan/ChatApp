const UI_STYLE_PATH_PATTERN = /^(?![/\\])(?!.*(?:^|[/\\])\.\.(?:[/\\]|$)).+\.css$/i;
const UI_ROOT_SOURCE_PATH_PATTERN = /^(?![/\\])(?!.*(?:^|[/\\])\.\.(?:[/\\]|$)).+\.jsx?$/i;

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function validateUiConfig(ui, path = 'ui') {
  const errors = [];
  if (ui === undefined) return errors;
  if (!isObject(ui)) return [`${path}: must be an object`];

  Object.keys(ui).forEach(key => {
    if (!['stylesheet', 'root'].includes(key)) errors.push(`${path}.${key}: unsupported ui field`);
  });
  if (ui.stylesheet !== undefined &&
      (typeof ui.stylesheet !== 'string' || !UI_STYLE_PATH_PATTERN.test(ui.stylesheet))) {
    errors.push(`${path}.stylesheet: path must be a safe relative css file`);
  }
  if (ui.root !== undefined) validateUiRoot(ui.root, `${path}.root`, errors);
  return errors;
}

function validateUiRoot(root, path, errors) {
  if (!isObject(root)) {
    errors.push(`${path}: must be an object`);
    return;
  }
  Object.keys(root).forEach(key => {
    if (!['type', 'source', 'style', 'props'].includes(key)) errors.push(`${path}.${key}: unsupported ui root field`);
  });
  if (root.type !== undefined && root.type !== 'react') errors.push(`${path}.type: must be react`);
  if (typeof root.source !== 'string' || !UI_ROOT_SOURCE_PATH_PATTERN.test(root.source)) {
    errors.push(`${path}.source: path must be a safe relative js/jsx file`);
  }
  if (root.style !== undefined &&
      (typeof root.style !== 'string' || !UI_STYLE_PATH_PATTERN.test(root.style))) {
    errors.push(`${path}.style: path must be a safe relative css file`);
  }
  if (root.props !== undefined && !isObject(root.props)) errors.push(`${path}.props: must be an object`);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { UI_STYLE_PATH_PATTERN, UI_ROOT_SOURCE_PATH_PATTERN, validateUiConfig };
}
