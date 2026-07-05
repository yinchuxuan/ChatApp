/* eslint-disable no-unused-vars */
/* global inTimelineRange */
/* exported resolveChapter2Timeline */

function setsunaAffection(state) {
  const value = state.setsuna && state.setsuna.affection;
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function toumaAffection(state) {
  const value = state.touma && state.touma.affection;
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function performanceProficiency(state) {
  const value = state.performance && state.performance.proficiency;
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function readStatePath(state, path) {
  return path.split('.').reduce((target, key) => (target ? target[key] : undefined), state);
}

function writeStatePath(state, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  let target = state;
  keys.forEach((key) => {
    if (!target[key] || typeof target[key] !== 'object') target[key] = {};
    target = target[key];
  });
  target[last] = value;
}

function ensureChapter2EventState(state) {
  if (!state.events || typeof state.events !== 'object') state.events = {};
  if (!Array.isArray(state.events.queue)) state.events.queue = [];
  if (!state.events.fired || typeof state.events.fired !== 'object') state.events.fired = {};
}

function enqueueChapter2Event(state, eventItem) {
  ensureChapter2EventState(state);
  if (state.events.fired[eventItem.id]) return;
  state.events.queue = [...state.events.queue, eventItem];
  state.events.fired[eventItem.id] = true;
}

function enqueueEventsAfterSlotTransition(state, rawSlot, ctx) {
  const previousSlot = readStatePath(state, 'story.progress') || readStatePath(state, 'timeline.currentSlot');
  if (previousSlot !== 'FixedPlot1' || rawSlot.id === 'FixedPlot1') return;
  enqueueChapter2Event(state, {
    id: 'chapter2_after_fixedplot1_rehearsal_memory',
    title: '梦中的余音',
    time: '2007.10.25 星期五 晚上',
    body: ctx.files.read('event.chapter2.afterFixedPlot1.rehearsalMemory'),
    options: [
      { id: 'piano', label: '隔壁的钢琴声', effects: { 'touma.affection': 1 } },
      { id: 'song', label: '天台的歌声', effects: { 'setsuna.affection': 1 } }
    ]
  });
}

const chapter2BranchRules = [
  {
    statePath: 'story.chapter2SetsunaBranch',
    decideOn: ['FixedPlot2', 'FixedPlot3', 'FixedPlot4'],
    lockedValues: ['secret', 'reserved'],
    decide: (state) => (setsunaAffection(state) >= 10 ? 'secret' : 'reserved')
  }
];

const chapter2SlotPlotOverrides = {
  FixedPlot2: {
    'story.chapter2SetsunaBranch': {
      reserved: { plotType: 'FixedPlot2Low', bgm: 'snow_scene', background: 'park' }
    }
  },
  FixedPlot3: {
    'story.chapter2SetsunaBranch': {
      reserved: { plotType: 'FixedPlot3Low', plotKind: 'free', background: 'park' }
    }
  }
};

const chapter2ConditionalSlotPlotOverrides = [
  {
    slotId: 'GameEnd1',
    when: (state) => readStatePath(state, 'story.chapter2SetsunaBranch') === 'secret'
      && setsunaAffection(state) > 20
      && toumaAffection(state) > 20
      && performanceProficiency(state) >= 20,
    override: {
      plotType: 'FixedPlot6',
      bgm: 'things',
      background: 'agreement',
      end: '2007.11.4: 22:00 星期日'
    }
  }
];

function resolveBranch(state, slot, rule) {
  if (rule.decideOn.indexOf(slot.id) === -1) return null;

  const current = readStatePath(state, rule.statePath);
  const locked = rule.lockedValues.indexOf(current) !== -1;
  if (locked) return { statePath: rule.statePath, value: current, locked };

  const value = rule.decide(state);
  writeStatePath(state, rule.statePath, value);
  return { statePath: rule.statePath, value, locked };
}

function resolveBranches(state, slot) {
  return chapter2BranchRules
    .map((rule) => resolveBranch(state, slot, rule))
    .filter(Boolean);
}

function applySlotPlotOverrides(state, slot) {
  const branches = resolveBranches(state, slot);
  const branchedSlot = branches.reduce((current, branch) => {
    const overrides = chapter2SlotPlotOverrides[slot.id] && chapter2SlotPlotOverrides[slot.id][branch.statePath];
    if (!overrides) return current;

    const lockedKey = `${branch.value}Locked`;
    const override = (branch.locked && overrides[lockedKey]) || overrides[branch.value];
    return override ? { ...current, ...override } : current;
  }, { ...slot, plotType: slot.id, slotId: slot.id });
  return chapter2ConditionalSlotPlotOverrides.reduce((current, item) => {
    return item.slotId === slot.id && item.when(state) ? { ...current, ...item.override } : current;
  }, branchedSlot);
}

function resolveChapter2Timeline(state, ctx) {
  if (readStatePath(state, 'story.chapter2GameEnd1Reached')) {
    return {
      chapter: 'chapter_2',
      plotFile: 'plot.chapter.2.gameEnd1Afterstory',
      slotId: 'GameEnd1Afterstory',
      plotType: 'GameEnd1Afterstory',
      plotKind: 'free',
      background: 'GameEnd1',
      end: '2099.12.31: 23:59 星期四'
    };
  }

  const slots = [
    {
      id: 'FixedPlot1',
      bgm: 'dream',
      background: 'rooftop2',
      end: '2007.10.26: 8:00 星期五',
      range: { gt: '2007.10.25: 16:00 星期四', lte: '2007.10.25: 17:30 星期五' }
    },
    {
      id: 'FreePlot1',
      end: '2007.10.29: 17:00 星期一',
      range: { gt: '2007.10.25: 17:30 星期五', lte: '2007.10.29: 12:00 星期一' }
    },
    {
      id: 'FixedPlot2',
      bgm: 'snow_scene',
      background: 'park',
      end: '2007.10.29: 18:00 星期一',
      range: { gt: '2007.10.29: 12:00 星期一', lte: '2007.10.29: 17:00 星期一' }
    },
    {
      id: 'FixedPlot3',
      bgm: 'bad_woman',
      background: 'ktv',
      end: '2007.10.29: 22:00 星期一',
      range: { gt: '2007.10.29: 17:00 星期一', lte: '2007.10.29: 18:00 星期一' }
    },
    {
      id: 'FreePlot2',
      end: '2007.10.31: 17:00 星期三',
      range: { gt: '2007.10.29: 18:00 星期一', lte: '2007.10.31: 12:00 星期三' }
    },
    {
      id: 'FixedPlot4',
      bgm: 'after_all_piano',
      background: 'touma_hand',
      end: '2007.10.31: 17:30 星期三',
      range: { gt: '2007.10.31: 12:00 星期三', lte: '2007.10.31: 17:00 星期三' }
    },
    {
      id: 'FreePlot3',
      end: '2007.11.2: 21:00 星期五',
      range: { gt: '2007.10.31: 17:00 星期三', lte: '2007.11.2: 18:00 星期五' }
    },
    {
      id: 'FixedPlot5',
      bgm: 'winter_night',
      background: 'home_party',
      end: '2007.11.4: 21:00 星期日',
      range: { gt: '2007.11.2: 18:00 星期五', lte: '2007.11.3: 21:00 星期六' }
    },
    {
      id: 'GameEnd1',
      bgm: 'unstoppable_dream',
      background: 'GameEnd1',
      end: '2012.11.4: 22:00 星期五',
      range: { gt: '2007.11.3: 21:00 星期六', lte: '2007.11.4: 21:00 星期六' }
    },
  ];
  const currentTime = state.timeline && state.timeline.currentTime;
  const rawSlot = slots.find((item) => inTimelineRange(currentTime, item.range)) || slots[0];
  enqueueEventsAfterSlotTransition(state, rawSlot, ctx);
  const slot = applySlotPlotOverrides(state, rawSlot);
  if (slot.plotType === 'GameEnd1') writeStatePath(state, 'story.chapter2GameEnd1Reached', true);
  return {
    chapter: 'chapter_2',
    plotFile: 'plot.chapter.2',
    slotId: slot.slotId,
    plotType: slot.plotType,
    plotKind: slot.plotKind || (slot.bgm ? 'fixed' : 'free'),
    bgm: slot.bgm,
    background: slot.background,
    end: slot.end
  };
}
