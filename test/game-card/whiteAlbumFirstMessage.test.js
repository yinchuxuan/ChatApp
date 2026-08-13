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
      {
        'visual.scene': 'musical_classroom3',
        'visual.portraits': { yanagihara: 'normal', takeya: 'normal' }
      },
      {
        'visual.portraits': {
          yanagihara: 'joy', mizusawa: 'normal', takeya: 'angry'
        }
      },
      { 'visual.portraits': { mizusawa: 'normal', takeya: 'sad' } },
      { 'visual.scene': 'classroom', 'visual.portraits': { takeya: 'normal' } },
      { 'visual.scene': 'classroom', 'visual.portraits': { takeya: 'joy' } },
      { 'visual.portraits': { mizusawa: 'normal', takeya: 'normal' } },
      { 'visual.portraits': { mizusawa: 'normal', takeya: 'sweating_smile' } },
      {
        'visual.scene': 'musical_classroom3',
        'visual.portraits': {},
        'audio.bgm': 'sad'
      },
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

  test('shows the club breakup before Haruki starts recruiting replacements', () => {
    expect(firstMessage).toContain('柳原朋');
    expect(firstMessage).toContain('饭塚武也');
    expect(firstMessage).toContain('水泽依绪');
    expect(firstMessage).toContain(
      '"visual.portraits":{"yanagihara":"joy","mizusawa":"normal","takeya":"angry"}'
    );
    expect(firstMessage).toContain('十分钟前还是六个人');
    expect(firstMessage.indexOf('柳原朋')).toBeLessThan(firstMessage.indexOf('“所以才要找人。”'));
    expect(firstMessage.length).toBeGreaterThanOrEqual(4500);
    expect(firstMessage.length).toBeLessThanOrEqual(5000);
  });

  test('follows the card writing restrictions', () => {
    expect(firstMessage).not.toMatch(/不是[^。\n]*而是|并不是[^。\n]*而是/);
    expect(firstMessage).not.toMatch(/不只是[^。\n]*更是/);
    expect(firstMessage).not.toMatch(/与其[^。\n]*不如/);
    expect(firstMessage).not.toMatch(/这一刻|某种意义上|说不清道不明|复杂的情绪/);
    expect(firstMessage).not.toMatch(/空气中弥漫着|命运的齿轮|一遍遍重来/);
    expect(firstMessage).not.toContain('得很');
    expect(firstMessage).not.toContain('那个Ta');
    expect(firstMessage).not.toContain('Miss 峰城大附属');
    expect(firstMessage).not.toContain('《WHITE ALBUM》');
  });

  test('uses rhetorical questions at internal conflict beats', () => {
    expect(firstMessage).toContain('自己究竟阻止过什么？');
    expect(firstMessage).toContain('怎么能先替所有人决定结束？');
    expect(firstMessage).toContain('又凭什么邀请别人陪自己上台？');
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
