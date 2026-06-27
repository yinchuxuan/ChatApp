const UI_STYLE_PATH_PATTERN = /^(?![/\\])(?!.*(?:^|[/\\])\.\.(?:[/\\]|$)).+\.css$/i;

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function validateUiConfig(ui, path = 'ui') {
  const errors = [];
  if (ui === undefined) return errors;
  if (!isObject(ui)) return [`${path}: must be an object`];

  Object.keys(ui).forEach(key => {
    if (key !== 'stylesheet') errors.push(`${path}.${key}: unsupported ui field`);
  });
  if (ui.stylesheet !== undefined &&
      (typeof ui.stylesheet !== 'string' || !UI_STYLE_PATH_PATTERN.test(ui.stylesheet))) {
    errors.push(`${path}.stylesheet: path must be a safe relative css file`);
  }
  return errors;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { UI_STYLE_PATH_PATTERN, validateUiConfig };
}
