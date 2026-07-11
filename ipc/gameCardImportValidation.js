const path = require('path');

let gameCardModules;

async function loadGameCardModules() {
  if (!gameCardModules) {
    gameCardModules = Promise.all([
      import('../shared/game-card/schema/validateGameCard.js'),
      import('../shared/game-card/schema/runtimeStateSchema.js'),
      import('../shared/game-card/state/stateSchema.js')
    ]).then(([validation, loader, schema]) => ({
      ensureStateDefaults: schema.ensureStateDefaults,
      mergeRuntimeStateSchema: loader.mergeRuntimeStateSchema,
      validateGameCard: validation.validateGameCard
    }));
  }
  return gameCardModules;
}

class GameCardValidationError extends Error {
  constructor(message, { stage, file = 'card.json', details = [] } = {}) {
    super(message);
    this.stage = stage;
    this.file = file;
    this.details = details;
  }
}

function detail(file, message) {
  return { file, message };
}

async function validateImportedGameCard(fs, card, cardDir) {
  const { ensureStateDefaults, mergeRuntimeStateSchema, validateGameCard } = await loadGameCardModules();
  const cardValidation = validateGameCard(card);
  if (!cardValidation.valid) {
    throw new GameCardValidationError('游戏卡主文件 schema 校验失败', {
      stage: 'validate_card',
      file: 'card.json',
      details: cardValidation.errors.map(error => detail('card.json', error))
    });
  }
  const schema = readStateSchema(fs, card, cardDir);
  const merged = mergeRuntimeStateSchema(schema ? { ...card, state: { ...card.state, schema } } : card);
  const defaults = ensureStateDefaults(merged.state?.schema || {}, {});
  const errors = defaults.errors;
  if (errors.length > 0) {
    throw new GameCardValidationError('游戏卡状态 schema 校验失败', {
      stage: 'validate_state_schema',
      file: schema ? card.stateSchema : 'card.json',
      details: errors.map(error => detail(schema ? card.stateSchema : 'card.json', error))
    });
  }
}

function readStateSchema(fs, card, cardDir) {
  const schemaFile = card?.stateSchema;
  if (typeof schemaFile !== 'string' || schemaFile.length === 0) return null;
  validateSchemaPath(schemaFile);
  const filePath = path.resolve(cardDir, schemaFile);
  if (!filePath.startsWith(path.resolve(cardDir) + path.sep)) {
    throw new GameCardValidationError('stateSchema 必须位于游戏卡目录内', {
      stage: 'load_state_schema',
      file: 'card.json',
      details: [detail('card.json', `stateSchema: unsafe path ${schemaFile}`)]
    });
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8') || '{}');
  } catch (error) {
    throw new GameCardValidationError('state schema 文件无法读取或不是合法 JSON', {
      stage: 'load_state_schema',
      file: schemaFile,
      details: [detail(schemaFile, error.message)]
    });
  }
}

function validateSchemaPath(value) {
  const parts = value.split('/');
  if (path.isAbsolute(value) || value.includes('\\') || !value.endsWith('.json') ||
      parts.some(part => part === '' || part === '..')) {
    throw new GameCardValidationError('stateSchema 必须是安全的相对 JSON 路径', {
      stage: 'load_state_schema',
      file: 'card.json',
      details: [detail('card.json', `stateSchema: invalid path ${value}`)]
    });
  }
}

module.exports = { GameCardValidationError, validateImportedGameCard };
