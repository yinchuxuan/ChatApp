/* eslint-disable no-unused-vars */
/* global include, resolveAttitudeSection, resolveChapter1EventCategory, resolveChapter1Timeline, resolveChapter2EventCategory, resolveChapter2Timeline, resolvePlotMood */
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

  function clampCurrentTimeToSlotEnd() {
    const currentTime = state.timeline.currentTime;
    const slotEnd = state.timeline.currentSlotEnd;
    const currentValue = parseTime(currentTime);
    const endValue = parseTime(slotEnd);
    state.temp.timelineTimeClamped = false;
    state.temp.timelineRequestedTime = '';
    if (!Number.isFinite(currentValue) || !Number.isFinite(endValue) || currentValue <= endValue) return;

    state.timeline.currentTime = slotEnd;
    state.temp.timelineTimeClamped = true;
    state.temp.timelineRequestedTime = currentTime;
  }

  function chapterKey() {
    if (state.story && (state.story.chapter2GameEnd1Reached || state.story.chapter2SuccessReached)) {
      return 'chapter_2';
    }

    const currentTime = state.timeline && state.timeline.currentTime;
    const chapter2Start = parseTime('2007.10.23: 17:00 星期二');
    return parseTime(currentTime) > chapter2Start ? 'chapter_2' : 'chapter_1';
  }

  function applyAttitudeSections() {
    state.temp.toumaAttitudeSection = resolveAttitudeSection(
      'ToumaAttitude', state.touma && state.touma.affection, 25
    );
    state.temp.setsunaAttitudeSection = resolveAttitudeSection(
      'SetsunaAttitude', state.setsuna && state.setsuna.affection, 15
    );
  }

  function applyFreePlot() {
    const roll = utils.randomInt(1, 100);
    const mood = resolvePlotMood(roll);
    const characterGuideRoll = utils.randomInt(1, 100);
    const hasEvent = mood !== 'normal'
      && ['plot.chapter.1', 'plot.chapter.2'].indexOf(state.temp.plotFile) !== -1;
    const eventRoll = hasEvent ? utils.randomInt(1, 100) : 0;
    let eventCategory = '';
    if (state.temp.plotFile === 'plot.chapter.1' && hasEvent) {
      eventCategory = resolveChapter1EventCategory(eventRoll);
    } else if (state.temp.plotFile === 'plot.chapter.2' && hasEvent) {
      eventCategory = resolveChapter2EventCategory(eventRoll);
    }
    state.temp.plotKind = 'free';
    state.temp.includeFreeGuide = true;
    state.temp.plotDirectionRoll = roll;
    state.temp.characterGuideRoll = characterGuideRoll;
    state.temp.plotMood = mood;
    state.temp.plotMoodSection = `PlotMood_${mood}`;
    state.temp.plotEventRoll = eventRoll;
    state.temp.plotEventCategory = eventCategory;
    state.temp.plotEventSection = eventCategory ? `PlotEvent_${eventCategory}` : '';
    applyAttitudeSections();
  }

  function applyFixedPlot() {
    state.temp.plotKind = 'fixed';
    state.temp.includeFreeGuide = false;
    state.temp.characterGuideRoll = 0;
    state.temp.plotMood = '';
    state.temp.plotMoodSection = '';
    state.temp.plotEventRoll = 0;
    state.temp.plotEventCategory = '';
    state.temp.plotEventSection = '';
    applyAttitudeSections();
  }

  const resolvers = { chapter_1: resolveChapter1Timeline, chapter_2: resolveChapter2Timeline };
  ensureObject('timeline');
  ensureObject('temp');
  ensureObject('story');

  clampCurrentTimeToSlotEnd();
  const resolver = resolvers[chapterKey()] || resolveChapter1Timeline;
  const result = resolver(state, ctx);

  state.timeline.currentSlot = result.slotId || result.plotType;
  state.timeline.currentSlotEnd = result.end;
  state.story.chapter = result.chapter;
  state.story.progress = result.slotId || result.plotType;
  state.temp.plotFile = result.plotFile;
  state.temp.PlotType = result.plotType;

  if (result.plotKind === 'free') applyFreePlot();
  else if (result.plotKind === 'fixed') applyFixedPlot();

  return { state };
}
