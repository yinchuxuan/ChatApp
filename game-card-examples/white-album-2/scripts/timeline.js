function run(ctx) {
  const { state, utils } = ctx;

  function ensureObject(path) {
    if (!state[path] || typeof state[path] !== 'object') state[path] = {};
  }

  function inRange(time, range) {
    if (range.gt !== undefined && !(time > range.gt)) return false;
    if (range.lte !== undefined && !(time <= range.lte)) return false;
    return true;
  }

  function bgmByRoll(roll) {
    if (roll <= 10) return 'tragic';
    if (roll < 30) return 'sad';
    if (roll < 70) return 'normal';
    if (roll < 90) return 'daily';
    return 'happy';
  }

  function attitudeSection(prefix, affection) {
    return prefix + (affection >= 10 ? 'High' : 'Low');
  }

  const slots = [
    { id: 'FreePlot1', range: { lte: '2007.10.21: 10:00 星期日' } },
    { id: 'FixedPlot1', bgm: 'WA_piano', background: 'musical_classroom3', range: { gt: '2007.10.21: 10:00 星期日', lte: '2007.10.21: 16:00 星期日' } },
    { id: 'FreePlot2', range: { gt: '2007.10.21: 16:00 星期日', lte: '2007.10.22: 16:00 星期一' } },
    { id: 'FixedPlot2', bgm: 'normal', background: 'invite', range: { gt: '2007.10.22: 16:00 星期一', lte: '2007.10.23: 10:00 星期二' } },
    { id: 'FreePlot3', range: { gt: '2007.10.23: 10:00 星期二', lte: '2007.10.24: 16:00 星期三' } },
    { id: 'FixedPlot3', bgm: 'sad', background: 'haiku', range: { gt: '2007.10.24: 16:00 星期三', lte: '2007.10.25: 10:00 星期四' } },
    { id: 'FixedPlot4', bgm: 'WA_3', background: 'rooftop', range: { gt: '2007.10.25: 10:00 星期四', lte: '2007.10.25: 16:00 星期四' } }
  ];

  ensureObject('temp');
  ensureObject('audio');
  ensureObject('visual');

  const currentTime = state.timeline && state.timeline.currentTime;
  const slot = slots.find((item) => inRange(currentTime, item.range));
  if (slot) state.temp.PlotType = slot.id;

  const plotType = state.temp.PlotType;
  const fixedSlot = slots.find((item) => item.id === plotType && item.bgm);
  if (/^FreePlot/.test(plotType || '')) {
    const roll = utils.randomInt(1, 100);
    const mood = bgmByRoll(roll);
    state.temp.plotKind = 'free';
    state.temp.includeFreeGuide = true;
    state.temp.plotDirectionRoll = roll;
    state.temp.plotMood = mood;
    state.temp.plotMoodSection = `PlotMood_${mood}`;
    state.temp.toumaAttitudeSection = attitudeSection('ToumaAttitude', state.touma && state.touma.affection);
    state.temp.setsunaAttitudeSection = attitudeSection('SetsunaAttitude', state.setsuna && state.setsuna.affection);
    state.audio.bgm = mood;
    state.visual.background = 'school';
  } else if (fixedSlot) {
    state.temp.plotKind = 'fixed';
    state.temp.includeFreeGuide = false;
    state.temp.plotMood = '';
    state.temp.plotMoodSection = '';
    state.temp.toumaAttitudeSection = '';
    state.temp.setsunaAttitudeSection = '';
    state.audio.bgm = fixedSlot.bgm;
    state.visual.background = fixedSlot.background;
  }

  return { state };
}
