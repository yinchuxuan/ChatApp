const IMAGE_PATH_PATTERN = /^(?![/\\])(?!.*(?:^|[/\\])\.\.(?:[/\\]|$)).+\.(png|jpg|jpeg|webp|gif|bmp)$/i;

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function validateVisualConfig(visual, path = 'visual') {
  const errors = [];
  if (visual === undefined) return errors;
  if (!isObject(visual)) return [`${path}: must be an object`];

  Object.entries(visual).forEach(([group, entries]) => {
    if (!isObject(entries)) {
      errors.push(`${path}.${group}: must be an object`);
      return;
    }
    Object.entries(entries).forEach(([key, relativePath]) => {
      if (typeof relativePath !== 'string' || !IMAGE_PATH_PATTERN.test(relativePath)) {
        errors.push(`${path}.${group}.${key}: path must be a safe relative image file`);
      }
    });
  });
  return errors;
}

function getBackgroundRelativePath(card, gameState) {
  const key = gameState?.visual?.background;
  if (!key || typeof key !== 'string') return '';
  return card?.visual?.background?.[key] || '';
}

function getVisualStateSchema(card) {
  const background = card?.visual?.background;
  if (!isObject(background)) return {};
  const values = Object.keys(background);
  if (values.length === 0) return {};
  return {
    'visual.background': {
      type: 'enum',
      values,
      default: values[0],
      description: '当前展示的背景图 key',
      llmRead: false,
      llmWrite: false
    }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { IMAGE_PATH_PATTERN, getBackgroundRelativePath, getVisualStateSchema, validateVisualConfig };
}
