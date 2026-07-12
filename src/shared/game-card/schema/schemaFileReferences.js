import gameCardSchema from './game-card.schema.json' assert { type: 'json' };

function resolvePointer(root, pointer) {
  if (!pointer.startsWith('#/')) return null;
  return pointer.slice(2).split('/').reduce((value, part) => {
    const key = part.replace(/~1/g, '/').replace(/~0/g, '~');
    return value?.[key];
  }, root);
}

function childPath(parent, key) {
  if (typeof key === 'number') return `${parent}[${key}]`;
  return parent ? `${parent}.${key}` : key;
}

function walk(value, schema, path, files) {
  if (!schema || typeof schema !== 'object') return;
  if (schema.$ref) walk(value, resolvePointer(gameCardSchema, schema.$ref), path, files);
  if (schema['x-file'] === true && typeof value === 'string') {
    files.push({ field: path, file: value });
  }

  ['allOf', 'anyOf', 'oneOf'].forEach(keyword => {
    schema[keyword]?.forEach(branch => walk(value, branch, path, files));
  });
  if (schema.then) walk(value, schema.then, path, files);
  if (schema.else) walk(value, schema.else, path, files);

  if (Array.isArray(value) && schema.items) {
    value.forEach((item, index) => walk(item, schema.items, childPath(path, index), files));
    return;
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;

  const properties = schema.properties || {};
  Object.entries(properties).forEach(([key, childSchema]) => {
    if (Object.prototype.hasOwnProperty.call(value, key)) {
      walk(value[key], childSchema, childPath(path, key), files);
    }
  });
  if (!schema.additionalProperties || typeof schema.additionalProperties !== 'object') return;
  Object.entries(value).forEach(([key, child]) => {
    if (!Object.prototype.hasOwnProperty.call(properties, key)) {
      walk(child, schema.additionalProperties, childPath(path, key), files);
    }
  });
}

function collectSchemaFileReferences(card) {
  const files = [];
  walk(card, gameCardSchema, '', files);
  return [...new Map(files.map(item => [`${item.field}\0${item.file}`, item])).values()];
}

export { collectSchemaFileReferences };
