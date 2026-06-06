const IMAGE_PATH_PATTERN = /^(?![/\\])(?!.*(?:^|[/\\])\.\.(?:[/\\]|$)).+\.(png|jpg|jpeg|webp|gif|bmp)$/i;
const STYLE_PATH_PATTERN = /^(?![/\\])(?!.*(?:^|[/\\])\.\.(?:[/\\]|$)).+\.css$/i;
const TEXT_PANEL_VALUES = ['center', 'left', 'right'];

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function validateVisualConfig(visual, path = 'visual') {
  const errors = [];
  if (visual === undefined) return errors;
  if (!isObject(visual)) return [`${path}: must be an object`];
  if (visual.stylesheet !== undefined && (typeof visual.stylesheet !== 'string' || !STYLE_PATH_PATTERN.test(visual.stylesheet))) {
    errors.push(`${path}.stylesheet: path must be a safe relative css file`);
  }

  Object.entries(visual).forEach(([group, entries]) => {
    if (group === 'stylesheet') return;
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
  if (!isObject(card?.visual)) return {};
  const schema = {
    'visual.textPanel': {
      type: 'enum',
      values: TEXT_PANEL_VALUES,
      default: 'center',
      description: '剧情阅读面板位置',
      llmRead: false,
      llmWrite: false
    }
  };
  const background = card.visual.background;
  if (!isObject(background)) return schema;
  const values = Object.keys(background);
  if (values.length === 0) return schema;
  schema['visual.background'] = {
      type: 'enum',
      values,
      default: values[0],
      description: '当前展示的背景图 key',
      llmRead: false,
      llmWrite: false
    };
  return schema;
}

function normalizeTextPanel(value) {
  return TEXT_PANEL_VALUES.includes(value) ? value : 'center';
}

if (typeof window !== 'undefined') {
  window.GameCardVisualConfig = { normalizeTextPanel };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    IMAGE_PATH_PATTERN,
    STYLE_PATH_PATTERN,
    TEXT_PANEL_VALUES,
    getBackgroundRelativePath,
    getVisualStateSchema,
    normalizeTextPanel,
    validateVisualConfig
  };
}
