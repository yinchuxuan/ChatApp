import { getAudioStateSchema } from './audioConfig.js';
import { getVisualStateSchema } from './visualConfig.js';

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

export { mergeAudioStateSchema, mergeRuntimeStateSchema };
