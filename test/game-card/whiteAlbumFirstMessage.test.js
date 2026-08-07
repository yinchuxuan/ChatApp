const fs = require('node:fs');
const path = require('node:path');
const { card } = require('./whiteAlbumTestCard');
const { applyGameCard } = require('../../src/renderer/gameCard/engine');
const { buildStatePatchTimeline } = require('../../src/renderer/chat/segmentedReadingModel');
const { extractLatestAssistantStatePatches } = require('../../src/shared/game-card/state/statePatch');

const cardDir = path.join(__dirname, '../../game-card-examples/white-album-2');
const firstMessage = fs.readFileSync(path.join(cardDir, 'first_msg.md'), 'utf-8');
const roleplayRules = fs.readFileSync(path.join(cardDir, 'roleplay_rules.md'), 'utf-8');

function parsePatches() {
  return extractLatestAssistantStatePatches([
    { role: 'assistant', content: firstMessage }
  ]).map(patch => JSON.parse(patch));
}

describe('white album first message', () => {
  test('uses the same cinematic state patch timeline as generated replies', () => {
    const patches = parsePatches();
    const timeline = buildStatePatchTimeline(firstMessage);

    expect(firstMessage.trimStart()).toMatch(/^<state_patch>/);
    expect(patches).toEqual([
      {
        'visual.scene': 'none',
        'visual.portraits': {},
        'audio.bgm': 'none'
      },
      {
        'visual.scene': 'classroom',
        'visual.portraits': {},
        'audio.bgm': 'steady'
      },
      { 'visual.portraits': { takeya: 'normal' } },
      { 'visual.portraits': { takeya: 'happy' } },
      { 'visual.portraits': { mizusawa: 'normal', takeya: 'happy' } },
      { 'visual.scene': 'school', 'visual.portraits': {}, 'audio.bgm': 'none' },
      { 'visual.scene': 'musical_classroom3', 'audio.bgm': 'sad' },
      {
        'touma.affection': 0,
        'setsuna.affection': 0,
        'performance.proficiency': 2,
        'timeline.currentTime': '2007.10.20: 15:00 星期六'
      }
    ]);
    expect(timeline.patches[0].boundary).toBe(0);
    expect(timeline.patches.map(patch => patch.boundary)).toEqual(
      [...timeline.patches.map(patch => patch.boundary)].sort((left, right) => left - right)
    );
  });

  test('introduces Takeya and Mizusawa with a shared portrait scene', () => {
    expect(firstMessage).toContain('饭塚武也');
    expect(firstMessage).toContain('水泽依绪');
    expect(firstMessage.length).toBeGreaterThanOrEqual(4500);
    expect(firstMessage.length).toBeLessThanOrEqual(5500);
  });

  test('wraps the choice area in the model-facing display tag', () => {
    expect(firstMessage).toMatch(/<choices>\nA\.[\s\S]*\nD\..*\n<\/choices>/);
    expect(roleplayRules).toContain('<choices>...</choices>');
  });

  test('enables patch playback without rerunning after_response', () => {
    const result = applyGameCard({
      card,
      phase: 'init',
      messages: [],
      state: {},
      fileContents: {
        'first_msg.md': firstMessage,
        'system_prompt.md': '系统提示'
      }
    });
    const message = result.messages.find(item => item._meta?.source === 'wa2_first_msg');

    expect(message._meta.statePatchPlayback).toEqual({
      appliedPatchCount: 0,
      afterResponseApplied: true
    });
  });
});
