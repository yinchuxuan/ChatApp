const MAX_IMPORT_DEPTH = 20;

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isImportObject(value) {
  return isPlainObject(value) && Object.keys(value).length === 1 && typeof value.$import === 'string';
}

function hasImportObject(value) {
  if (isImportObject(value)) return true;
  if (Array.isArray(value)) return value.some(hasImportObject);
  if (!isPlainObject(value)) return false;
  return Object.values(value).some(hasImportObject);
}

async function readImport(cardId, importPath, api) {
  if (!cardId || !api || typeof api.readGameCardFile !== 'function') {
    throw new Error('game card import requires readGameCardFile');
  }
  const result = await api.readGameCardFile(cardId, importPath);
  if (!result?.success) throw new Error(result?.error || 'failed to read game card import');
  try {
    return JSON.parse(result.content || 'null');
  } catch (error) {
    throw new Error(`game card import must be valid JSON: ${error.message}`);
  }
}

async function expandValue(cardId, value, api, stack) {
  if (isImportObject(value)) {
    if (stack.includes(value.$import)) throw new Error(`circular game card import: ${value.$import}`);
    if (stack.length >= MAX_IMPORT_DEPTH) throw new Error('game card import depth limit exceeded');
    const imported = await readImport(cardId, value.$import, api);
    return expandValue(cardId, imported, api, [...stack, value.$import]);
  }
  if (Array.isArray(value)) {
    const items = await Promise.all(value.map((item) => expandValue(cardId, item, api, stack)));
    return items.flatMap((item) => (Array.isArray(item) ? item : [item]));
  }
  if (!isPlainObject(value)) return value;
  const entries = await Promise.all(
    Object.entries(value).map(async ([key, child]) => [key, await expandValue(cardId, child, api, stack)])
  );
  return Object.fromEntries(entries);
}

async function expandCardImports(card, api) {
  if (!card || !card.id) return card;
  if (!hasImportObject(card)) return card;
  return expandValue(card.id, card, api, []);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { expandCardImports };
}
