import {
  mergeAudioStateSchema,
  mergeRuntimeStateSchema
} from '../../shared/game-card/schema/runtimeStateSchema.js';

function hasSchemaFile(card) {
  return typeof card?.stateSchema === 'string' && card.stateSchema.length > 0;
}

function parseStateSchema(content) {
  try {
    return JSON.parse(content || '{}');
  } catch (error) {
    throw new Error(`state schema file must be valid JSON: ${error.message}`);
  }
}

async function readExternalStateSchema(card, resources) {
  if (!hasSchemaFile(card)) return null;
  if (!card?.id || typeof resources?.readText !== 'function') {
    throw new Error('state schema requires resources.readText');
  }
  return parseStateSchema(await resources.readText(card.id, card.stateSchema));
}

function mergeExternalStateSchema(card, schema) {
  if (schema === null) return mergeRuntimeStateSchema(card);
  return mergeRuntimeStateSchema({
    ...card,
    state: {
      ...card.state,
      schema
    }
  });
}

async function loadExternalStateSchema(card, resources) {
  const schema = await readExternalStateSchema(card, resources);
  return mergeExternalStateSchema(card, schema);
}

export {
  loadExternalStateSchema,
  mergeAudioStateSchema,
  mergeExternalStateSchema,
  mergeRuntimeStateSchema,
  parseStateSchema,
  readExternalStateSchema
};
