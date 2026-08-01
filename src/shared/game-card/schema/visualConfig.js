const TEXT_PANEL_VALUES = ['center', 'left', 'right'];
const MAX_PORTRAITS = 4;

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function getSceneKind(card, key) {
  if (Object.prototype.hasOwnProperty.call(card?.visual?.background || {}, key)) return 'background';
  if (Object.prototype.hasOwnProperty.call(card?.visual?.cg || {}, key)) return 'cg';
  return '';
}

function getSceneRelativePath(card, gameState) {
  const key = gameState?.visual?.scene;
  if (!key || typeof key !== 'string') return '';
  const kind = getSceneKind(card, key);
  return kind ? card.visual[kind][key] : '';
}

function getPortraitResources(card, gameState) {
  if (getSceneKind(card, gameState?.visual?.scene) === 'cg') return [];
  const portraits = gameState?.visual?.portraits;
  if (!isObject(portraits)) return [];
  return Object.entries(card?.visual?.portrait || {})
    .filter(([character]) => typeof portraits[character] === 'string')
    .map(([character, expressions]) => ({
      character,
      expression: portraits[character],
      path: expressions?.[portraits[character]] || ''
    }))
    .filter(item => item.path)
    .slice(0, MAX_PORTRAITS);
}

function migrateLegacyPortraitState(card, state = {}) {
  if (!isObject(card?.visual?.portrait)
    || !isObject(state?.visual)
    || Object.prototype.hasOwnProperty.call(state.visual, 'portraits')
    || typeof state.visual.portrait !== 'string') {
    return { state, changed: false };
  }
  const legacy = state.visual.portrait;
  const selected = {};
  Object.entries(card?.visual?.portrait || {}).some(([character, expressions]) => {
    const expression = Object.keys(expressions || {})
      .find(item => `${character}_${item}` === legacy);
    if (!expression) return false;
    selected[character] = expression;
    return true;
  });
  const visual = { ...state.visual };
  delete visual.portrait;
  return {
    state: { ...state, visual: { ...visual, portraits: selected } },
    changed: true
  };
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
    schema['visual.portraits'] = {
      type: 'object',
      properties: Object.fromEntries(Object.entries(portrait).map(([character, expressions]) => [
        character,
        { type: 'enum', values: Object.keys(expressions || {}) }
      ])),
      additionalProperties: false,
      maxProperties: MAX_PORTRAITS,
      default: {},
      description: '当前展示的人物到表情映射，最多四人',
      llmRead: false,
      llmWrite: false
    };
  }
  const backgrounds = isObject(card.visual.background) ? Object.keys(card.visual.background) : [];
  const cgs = isObject(card.visual.cg) ? Object.keys(card.visual.cg) : [];
  const values = [...backgrounds, ...cgs];
  if (values.length === 0) return schema;
  schema['visual.scene'] = {
    type: 'enum',
    values,
    default: values[0],
    description: '当前展示的背景或剧情 CG key',
    llmRead: false,
    llmWrite: false
  };
  return schema;
}

function normalizeTextPanel(value) {
  return TEXT_PANEL_VALUES.includes(value) ? value : 'center';
}

export {
  MAX_PORTRAITS,
  TEXT_PANEL_VALUES,
  getPortraitResources,
  getSceneKind,
  getSceneRelativePath,
  getVisualStateSchema,
  migrateLegacyPortraitState,
  normalizeTextPanel
};
