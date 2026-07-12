const TEXT_PANEL_VALUES = ['center', 'left', 'right'];
const EMPTY_PORTRAIT = 'none';

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function getBackgroundRelativePath(card, gameState) {
  const key = gameState?.visual?.background;
  if (!key || typeof key !== 'string') return '';
  return card?.visual?.background?.[key] || '';
}

function getPortraitRelativePath(card, gameState) {
  const key = gameState?.visual?.portrait;
  if (!key || key === EMPTY_PORTRAIT || typeof key !== 'string') return '';
  return card?.visual?.portrait?.[key] || '';
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
  const portrait = card.visual.portrait;
  if (isObject(portrait)) {
    schema['visual.portrait'] = {
      type: 'enum',
      values: [EMPTY_PORTRAIT, ...Object.keys(portrait)],
      default: EMPTY_PORTRAIT,
      description: '当前展示的立绘 key',
      llmRead: false,
      llmWrite: false
    };
  }
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

export {
  EMPTY_PORTRAIT,
  TEXT_PANEL_VALUES,
  getBackgroundRelativePath,
  getPortraitRelativePath,
  getVisualStateSchema,
  normalizeTextPanel
};
