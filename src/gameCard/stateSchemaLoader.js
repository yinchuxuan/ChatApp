const { getAudioStateSchema } = require('./audioConfig');
const { getVisualStateSchema } = require('./visualConfig');

function hasSchemaFile(card) {
  return typeof card?.state?.schemaFile === 'string' && card.state.schemaFile.length > 0;
}

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function mergeRuntimeStateSchema(card) {
  const runtimeSchema = { ...getAudioStateSchema(card), ...getVisualStateSchema(card) };
  if (Object.keys(runtimeSchema).length === 0) return card;

  const state = isObject(card?.state) ? card.state : {};
  const source = isObject(state.schema?.schema) ? state.schema.schema : (isObject(state.schema) ? state.schema : {});
  const schema = { ...source };
  Object.entries(runtimeSchema).forEach(([path, definition]) => {
    if (!Object.prototype.hasOwnProperty.call(schema, path)) schema[path] = definition;
  });
  return { ...card, state: { ...state, schema: { schema } } };
}

const mergeAudioStateSchema = mergeRuntimeStateSchema;

async function loadExternalStateSchema(card, api) {
  if (!hasSchemaFile(card)) return mergeRuntimeStateSchema(card);
  if (!card?.id || !api || typeof api.readGameCardFile !== 'function') {
    throw new Error('state schema requires readGameCardFile');
  }

  const result = await api.readGameCardFile(card.id, card.state.schemaFile);
  if (!result?.success) throw new Error(result?.error || 'failed to read state schema file');

  let schema;
  try {
    schema = JSON.parse(result.content || '{}');
  } catch (error) {
    throw new Error(`state schema file must be valid JSON: ${error.message}`);
  }

  return mergeRuntimeStateSchema({
    ...card,
    state: {
      ...card.state,
      schema
    }
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { loadExternalStateSchema, mergeAudioStateSchema, mergeRuntimeStateSchema };
}
