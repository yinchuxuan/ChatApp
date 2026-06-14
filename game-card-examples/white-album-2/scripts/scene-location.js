/* exported run */

function ensureObject(state, key) {
  if (!state[key] || typeof state[key] !== 'object') state[key] = {};
}

function latestAssistant(messages) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i] && messages[i].role === 'assistant') return messages[i];
  }
  return null;
}

function extractLocation(content) {
  const match = String(content || '').match(/^【时间地点】[^\n｜|]+[｜|]\s*([^\n]+)/m);
  return match ? match[1].trim() : '';
}

function resolveScene(rawLocation) {
  const locations = [
    { id: 'third_music_room', background: 'musical_classroom3', patterns: ['第三音乐教室', '第三音乐室'] },
    { id: 'classroom', background: 'classroom', patterns: ['教室', '班'] },
    { id: 'school', background: 'school', patterns: ['峰城大附属', '学校', '校园'] }
  ];
  return locations.find((location) => (
    location.patterns.some((pattern) => rawLocation.includes(pattern))
  ));
}

function run(ctx) {
  const { messages, state } = ctx;
  const assistant = latestAssistant(messages);
  const rawLocation = extractLocation(assistant && assistant.content);
  const scene = rawLocation && resolveScene(rawLocation);
  if (!scene) return { state };

  ensureObject(state, 'story');
  ensureObject(state, 'visual');
  state.story.location = scene.id;
  state.story.locationText = rawLocation;
  state.visual.background = scene.background;
  return { state };
}
