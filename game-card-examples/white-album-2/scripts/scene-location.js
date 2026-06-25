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

function cleanLocation(value) {
  return String(value || '').trim().replace(/\s*[：:].*$/, '').trim();
}

function extractHeaderLocation(content) {
  const match = String(content || '').match(/^【时间地点】[^\n｜|]+[｜|]\s*([^\n]+)/m);
  return match ? cleanLocation(match[1]) : '';
}

function extractSummaryLocation(content) {
  const match = String(content || '').match(/<summary>\s*([\s\S]*?)\s*<\/summary>/i);
  if (!match) return '';
  const summary = match[1].replace(/^时间地点[：:]\s*/, '').trim();
  const place = summary.match(/[｜|]\s*([^\n]+)/);
  return cleanLocation(place ? place[1] : summary);
}

function extractLocation(content) {
  return extractHeaderLocation(content) || extractSummaryLocation(content);
}

function resolveScene(rawLocation) {
  const locations = [
    { id: 'third_music_room', background: 'musical_classroom3', patterns: ['第三音乐教室', '第三音乐室'] },
    { id: 'classroom', background: 'classroom', patterns: ['教室', '班'] },
    { id: 'school', background: 'school', patterns: ['峰城大附属', '峰城大付属', '学校', '校园'] }
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
  ensureObject(state, 'temp');
  state.temp.sceneLocationUnmatched = scene || !rawLocation ? '' : rawLocation;
  if (!scene) return { state };

  ensureObject(state, 'story');
  ensureObject(state, 'visual');
  state.story.location = scene.id;
  state.story.locationText = rawLocation;
  if (state.temp.plotKind === 'free') state.visual.background = scene.background;
  return { state };
}
