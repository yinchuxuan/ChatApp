function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function getBgmRelativePath(card, gameState) {
  const key = gameState?.audio?.bgm;
  if (!key || typeof key !== 'string') return '';
  return card?.audio?.bgm?.[key] || '';
}

function getAudioStateSchema(card) {
  const bgm = card?.audio?.bgm;
  if (!isObject(bgm)) return {};
  const values = Object.keys(bgm);
  if (values.length === 0) return {};
  return {
    'audio.bgm': {
      type: 'enum',
      values,
      default: values[0],
      description: '当前播放的 BGM key',
      llmRead: false,
      llmWrite: false
    }
  };
}

export { getAudioStateSchema, getBgmRelativePath };
