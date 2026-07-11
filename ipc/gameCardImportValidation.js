const path = require('path');

let gameCardModules;

async function loadGameCardModules() {
  if (!gameCardModules) {
    gameCardModules = Promise.all([
      import('../shared/game-card/schema/validateGameCard.js'),
      import('../shared/game-card/schema/runtimeStateSchema.js'),
      import('../shared/game-card/schema/schemaFileReferences.js'),
      import('../shared/game-card/state/stateSchema.js')
    ]).then(([validation, loader, fileReferences, schema]) => ({
      collectSchemaFileReferences: fileReferences.collectSchemaFileReferences,
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

async function validateImportedGameCard(store, card, cardDir) {
  const modules = await loadGameCardModules();
  const { ensureStateDefaults, mergeRuntimeStateSchema, validateGameCard } = modules;
  const cardValidation = validateGameCard(card);
  if (!cardValidation.valid) {
    throw new GameCardValidationError('游戏卡主文件 schema 校验失败', {
      stage: 'validate_card',
      file: 'card.json',
      details: cardValidation.errors.map(error => detail('card.json', error))
    });
  }
  await validateReferencedFiles(store, card, cardDir, modules.collectSchemaFileReferences);
  const schema = await readStateSchema(store, card, cardDir);
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

async function validateReferencedFiles(store, card, cardDir, collectReferences) {
  const references = collectReferences(card);
  const missing = [];
  for (const reference of references) {
    const filePath = path.resolve(cardDir, reference.file);
    if (!(await store.exists(filePath))) {
      missing.push(detail(reference.file, `${reference.field}: file not found`));
    }
  }
  if (missing.length > 0) {
    throw new GameCardValidationError('游戏卡引用的资源文件不存在', {
      stage: 'validate_files',
      details: missing
    });
  }
}

async function readStateSchema(store, card, cardDir) {
  const schemaFile = card?.stateSchema;
  if (typeof schemaFile !== 'string' || schemaFile.length === 0) return null;
  const filePath = path.resolve(cardDir, schemaFile);
  try {
    return JSON.parse(await store.readText(filePath) || '{}');
  } catch (error) {
    throw new GameCardValidationError('state schema 文件无法读取或不是合法 JSON', {
      stage: 'load_state_schema',
      file: schemaFile,
      details: [detail(schemaFile, error.message)]
    });
  }
}

module.exports = { GameCardValidationError, validateImportedGameCard };
