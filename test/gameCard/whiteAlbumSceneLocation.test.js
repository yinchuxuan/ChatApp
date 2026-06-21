const fs = require('node:fs');
const path = require('node:path');
const { card, stateSchema } = require('./whiteAlbumTestCard');
const { applyGameCard } = require('../../src/gameCard/engine');
const { ensureStateDefaults } = require('../../src/gameCard/stateSchema');
const { mergeAudioStateSchema } = require('../../src/gameCard/stateSchemaLoader');

const loadedCard = mergeAudioStateSchema({ ...card, state: { ...card.state, schema: stateSchema } });
const cardDir = path.join(__dirname, '../../game-card-examples/white-album-2');
function readCardFile(relativePath) { return fs.readFileSync(path.join(cardDir, relativePath), 'utf-8'); }

const fileContents = {
  'scripts/scene-location.js': readCardFile('scripts/scene-location.js')
};

function applyAssistant(content, overrides = {}) {
  const state = ensureStateDefaults(loadedCard.state.schema, overrides).state;
  return applyGameCard({
    card: loadedCard,
    phase: 'after_response',
    messages: [{ role: 'assistant', content }],
    state,
    fileContents
  });
}

describe('white album scene location background', () => {
  test.each([
    ['峰城大附属第三音乐室', 'third_music_room', 'musical_classroom3'],
    ['3年A班教室', 'classroom', 'classroom'],
    ['峰城大附属中学', 'school', 'school']
  ])('maps %s to the matching background', (place, location, background) => {
    const result = applyAssistant(`【时间地点】2007.10.20: 15:00 星期六｜${place}\n正文`, {
      temp: { plotKind: 'free' }
    });

    expect(result.trace.errors).toEqual([]);
    expect(result.state.story.location).toBe(location);
    expect(result.state.story.locationText).toBe(place);
    expect(result.state.visual.background).toBe(background);
    expect(result.state.temp.sceneLocationUnmatched).toBe('');
  });

  test('does not override fixed plot background', () => {
    const result = applyAssistant('【时间地点】2007.10.20: 15:00 星期六｜3年A班教室\n正文', {
      temp: { plotKind: 'fixed' },
      visual: { background: 'musical_classroom3' }
    });

    expect(result.trace.errors).toEqual([]);
    expect(result.state.story.location).toBe('classroom');
    expect(result.state.visual.background).toBe('musical_classroom3');
  });

  test('falls back to summary location', () => {
    const result = applyAssistant('正文\n<summary>2007.10.20: 15:00 星期六｜峰城大附属中学：继续在校园内寻找线索。</summary>', {
      temp: { plotKind: 'free' }
    });

    expect(result.trace.errors).toEqual([]);
    expect(result.state.story.location).toBe('school');
    expect(result.state.story.locationText).toBe('峰城大附属中学');
    expect(result.state.visual.background).toBe('school');
  });

  test('records unmatched locations without changing background', () => {
    const result = applyAssistant('【时间地点】2007.10.20: 15:00 星期六｜咖啡店\n正文', {
      temp: { plotKind: 'free' },
      visual: { background: 'school' }
    });

    expect(result.trace.errors).toEqual([]);
    expect(result.state.temp.sceneLocationUnmatched).toBe('咖啡店');
    expect(result.state.visual.background).toBe('school');
  });

  test('keeps the current background when no known location is written', () => {
    const result = applyAssistant('没有时间地点格式的回复', {
      temp: { plotKind: 'free' },
      story: { location: 'school' },
      visual: { background: 'school' }
    });

    expect(result.trace.errors).toEqual([]);
    expect(result.state.story.location).toBe('school');
    expect(result.state.visual.background).toBe('school');
    expect(result.state.temp.sceneLocationUnmatched).toBe('');
  });
});
