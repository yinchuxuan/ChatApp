function hasSchemaFile(card) {
  return typeof card?.state?.schemaFile === 'string' && card.state.schemaFile.length > 0;
}

async function loadExternalStateSchema(card, api) {
  if (!hasSchemaFile(card)) return card;
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

  return {
    ...card,
    state: {
      ...card.state,
      schema
    }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { loadExternalStateSchema };
}
