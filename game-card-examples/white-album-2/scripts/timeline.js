/* eslint-disable no-unused-vars */
/* global include, resolveAttitudeSection, resolveChapter1Timeline, resolveChapter2Timeline, resolvePlotMood */
/* exported run */

include("./timelines/chapter-1.js");
include("./timelines/chapter-2.js");

function run(ctx) {
  const { state, utils } = ctx;

  function ensureObject(path) {
    if (!state[path] || typeof state[path] !== 'object') state[path] = {};
  }

  function parseTime(value) {
    const match = String(value || '').match(/^(\d{4})\.(\d{1,2})\.(\d{1,2}):\s*(\d{1,2}):(\d{2})/);
    if (!match) return Number.NEGATIVE_INFINITY;
    const [, year, month, day, hour, minute] = match;
    return Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  }

  function chapterKey() {
    const currentTime = state.timeline && state.timeline.currentTime;
    const chapter2Start = parseTime('2007.10.25: 16:00 星期四');
    return parseTime(currentTime) > chapter2Start ? 'chapter_2' : 'chapter_1';
  }

  function applyFreePlot(result) {
    const roll = utils.randomInt(1, 100);
    const mood = resolvePlotMood(roll);
    state.temp.plotKind = 'free';
    state.temp.includeFreeGuide = true;
    state.temp.plotDirectionRoll = roll;
    state.temp.plotMood = mood;
    state.temp.plotMoodSection = `PlotMood_${mood}`;
    state.temp.toumaAttitudeSection = resolveAttitudeSection('ToumaAttitude', state.touma && state.touma.affection);
    state.temp.setsunaAttitudeSection = resolveAttitudeSection('SetsunaAttitude', state.setsuna && state.setsuna.affection);
    state.audio.bgm = mood;
    state.visual.background = result.background || 'school';
  }

  function applyFixedPlot(result) {
    state.temp.plotKind = 'fixed';
    state.temp.includeFreeGuide = false;
    state.temp.plotMood = '';
    state.temp.plotMoodSection = '';
    state.temp.toumaAttitudeSection = '';
    state.temp.setsunaAttitudeSection = '';
    state.audio.bgm = result.bgm;
    state.visual.background = result.background;
  }

  const resolvers = { chapter_1: resolveChapter1Timeline, chapter_2: resolveChapter2Timeline };
  const resolver = resolvers[chapterKey()] || resolveChapter1Timeline;
  const result = resolver(state);

  ensureObject('temp');
  ensureObject('audio');
  ensureObject('visual');
  ensureObject('story');

  state.story.chapter = result.chapter;
  state.story.progress = result.plotType;
  state.temp.plotFile = result.plotFile;
  state.temp.PlotType = result.plotType;

  if (result.plotKind === 'free') applyFreePlot(result);
  else if (result.plotKind === 'fixed') applyFixedPlot(result);

  return { state };
}
