import Ajv from 'ajv';
import gameCardSchema from './game-card.schema.json' assert { type: 'json' };

const ajv = new Ajv({ $data: true, allErrors: true, strict: false, strictNumbers: true });
const validateSchema = ajv.compile(gameCardSchema);
const GAME_CARD_SCHEMA_VERSION = gameCardSchema['x-schema-version'];

function decodePointerPart(value) {
  return value.replace(/~1/g, '/').replace(/~0/g, '~');
}

function pointerToPath(pointer) {
  const parts = pointer.split('/').slice(1).map(decodePointerPart);
  return parts.reduce((path, part) => {
    if (/^\d+$/.test(part)) return `${path}[${part}]`;
    return path ? `${path}.${part}` : part;
  }, '');
}

function errorPath(error) {
  const path = pointerToPath(error.instancePath || '');
  if (error.keyword === 'required') {
    return path ? `${path}.${error.params.missingProperty}` : error.params.missingProperty;
  }
  if (error.keyword === 'additionalProperties') {
    return path ? `${path}.${error.params.additionalProperty}` : error.params.additionalProperty;
  }
  return path || 'card';
}

function errorMessage(error) {
  if (error.keyword === 'required') return 'is required';
  if (error.keyword === 'additionalProperties') return 'is not allowed';
  return error.message || `failed ${error.keyword} validation`;
}

function formatSchemaErrors(errors = []) {
  const actionable = errors.filter(error => error.keyword !== 'if');
  return [...new Set(actionable.map(error => `${errorPath(error)}: ${errorMessage(error)}`))];
}

function validateGameCard(card) {
  const valid = validateSchema(card);
  if (!valid) return { valid: false, errors: formatSchemaErrors(validateSchema.errors) };
  const errors = [];
  const backgroundKeys = Object.keys(card?.visual?.background || {});
  const cgKeys = new Set(Object.keys(card?.visual?.cg || {}));
  backgroundKeys.filter(key => cgKeys.has(key)).forEach(key => {
    errors.push(`visual.cg.${key}: key duplicates visual.background.${key}`);
  });
  return { valid: errors.length === 0, errors };
}

export { GAME_CARD_SCHEMA_VERSION, formatSchemaErrors, validateGameCard };
