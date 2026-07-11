import {
  mergeAudioStateSchema,
  mergeRuntimeStateSchema
} from '../../shared/game-card/schema/runtimeStateSchema.js';

function hasSchemaFile(card) {
  return typeof card?.stateSchema === 'string' && card.stateSchema.length > 0;
}

async function loadExternalStateSchema(card, api) {
  if (!hasSchemaFile(card)) return mergeRuntimeStateSchema(card);
  if (!card?.id || !api || typeof api.readGameCardFile !== 'function') {
    throw new Error('state schema requires readGameCardFile');
  }

  const result = await api.readGameCardFile(card.id, card.stateSchema);
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

export { loadExternalStateSchema, mergeAudioStateSchema, mergeRuntimeStateSchema };
