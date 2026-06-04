const AUDIO_PATH_PATTERN = /^(?![/\\])(?!.*(?:^|[/\\])\.\.(?:[/\\]|$)).+\.(mp3|ogg|wav|m4a)$/i;

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function validateAudioConfig(audio, path = 'audio') {
  const errors = [];
  if (audio === undefined) return errors;
  if (!isObject(audio)) return [`${path}: must be an object`];

  Object.entries(audio).forEach(([group, entries]) => {
    if (!isObject(entries)) {
      errors.push(`${path}.${group}: must be an object`);
      return;
    }
    Object.entries(entries).forEach(([key, relativePath]) => {
      if (typeof relativePath !== 'string' || !AUDIO_PATH_PATTERN.test(relativePath)) {
        errors.push(`${path}.${group}.${key}: path must be a safe relative audio file`);
      }
    });
  });
  return errors;
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AUDIO_PATH_PATTERN, getAudioStateSchema, getBgmRelativePath, validateAudioConfig };
}
