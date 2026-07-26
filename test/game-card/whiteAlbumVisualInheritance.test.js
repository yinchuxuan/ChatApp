const fs = require('node:fs');
const path = require('node:path');
const { card, stateSchema } = require('./whiteAlbumTestCard');
const { applyGameCard } = require('../../src/renderer/gameCard/engine');
const { ensureStateDefaults } = require('../../src/shared/game-card/state/stateSchema');
const { applyLatestAssistantStatePatch } = require('../../src/shared/game-card/state/statePatch');
const { mergeAudioStateSchema } = require('../../src/renderer/gameCard/stateSchemaLoader');

const cardDir = path.join(__dirname, '../../game-card-examples/white-album-2');
const loadedCard = mergeAudioStateSchema({ ...card, state: { ...card.state, schema: stateSchema } });
const ruleIds = ['wa2-resolve-timeline', 'wa2-scene-location', 'wa2-resolve-portrait'];
const visualCard = {
  ...loadedCard,
  rules: loadedCard.rules.filter((rule) => ruleIds.includes(rule.id))
};

function readCardFile(relativePath) {
  return fs.readFileSync(path.join(cardDir, relativePath), 'utf8');
}

const fileContents = {
  'scripts/timeline.js': readCardFile('scripts/timeline.js'),
  'scripts/timelines/chapter-1.js': readCardFile('scripts/timelines/chapter-1.js'),
  'scripts/timelines/chapter-2.js': readCardFile('scripts/timelines/chapter-2.js'),
  'scripts/scene-location.js': readCardFile('scripts/scene-location.js'),
  'scripts/resolve-portrait.js': readCardFile('scripts/resolve-portrait.js')
};

describe('white album free plot visual inheritance', () => {
  test('keeps the previous scene while streaming and applies the completed response scene', () => {
    const state = ensureStateDefaults(loadedCard.state.schema, {
      timeline: { currentTime: '2007.10.20: 15:00 星期六' },
      scene: { portrait: 'setsuna_sad' },
      visual: { background: 'classroom', portrait: 'setsuna_sad' }
    }).state;
    const streaming = applyGameCard({
      card: visualCard,
      phase: 'pre_send',
      messages: [{ role: 'user', content: '继续' }],
      state,
      fileContents
    });

    expect(streaming.state.temp.plotKind).toBe('free');
    expect(streaming.state.visual.background).toBe('classroom');
    expect(streaming.state.visual.portrait).toBe('setsuna_sad');

    const response = {
      role: 'assistant',
      content: [
        '【时间地点】2007.10.20: 15:20 星期六｜峰城大附属第三音乐室',
        '正文',
        '<state_patch>',
        '[{"type":"state.set","path":"scene.portrait","value":"touma_happy"}]',
        '</state_patch>'
      ].join('\n')
    };
    const completed = applyGameCard({
      card: visualCard,
      phase: 'after_response',
      messages: [response],
      state: streaming.state,
      fileContents
    });
    const patched = applyLatestAssistantStatePatch(completed.messages, completed.state, {
      schema: loadedCard.state.schema
    });

    expect(completed.state.visual.background).toBe('musical_classroom3');
    expect(completed.state.visual.portrait).toBe('touma_happy');
    expect(patched.state.scene.portrait).toBe('touma_happy');
  });
});
