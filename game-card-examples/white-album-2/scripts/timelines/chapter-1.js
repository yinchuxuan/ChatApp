/* eslint-disable no-unused-vars */
/* exported resolveAttitudeSection, resolveChapter1EventCategory, resolveChapter1Timeline, resolvePlotMood */

function resolvePlotMood(roll) {
  if (roll <= 10) return 'tragic';
  if (roll < 30) return 'sad';
  if (roll < 70) return 'normal';
  if (roll < 90) return 'daily';
  return 'happy';
}

function resolveChapter1EventCategory(roll) {
  if (roll <= 50) return 'recruitment';
  if (roll <= 70) return 'friends';
  if (roll <= 85) return 'school';
  return 'personal';
}

function resolveAttitudeSection(prefix, affection, threshold) {
  return prefix + (affection >= threshold ? 'High' : 'Low');
}

function parseTimelineTime(value) {
  const match = String(value || '').match(/^(\d{4})\.(\d{1,2})\.(\d{1,2}):\s*(\d{1,2}):(\d{2})/);
  if (!match) return Number.NEGATIVE_INFINITY;
  const [, year, month, day, hour, minute] = match;
  return Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
}

function inTimelineRange(time, range) {
  const value = parseTimelineTime(time);
  if (range.gt !== undefined && !(value > parseTimelineTime(range.gt))) return false;
  if (range.lte !== undefined && !(value <= parseTimelineTime(range.lte))) return false;
  return true;
}

function resolveChapter1Timeline(state) {
  const slots = [
    {
      id: 'FreePlot1',
      plotKind: 'free',
      end: '2007.10.21: 16:00 星期日',
      range: { lte: '2007.10.21: 14:00 星期日' }
    },
    {
      id: 'FixedPlot1',
      plotKind: 'fixed',
      end: '2007.10.21: 18:00 星期日',
      range: { gt: '2007.10.21: 14:00 星期日', lte: '2007.10.21: 16:00 星期日' }
    },
    {
      id: 'FreePlot2',
      plotKind: 'free',
      end: '2007.10.22: 8:00 星期一',
      range: { gt: '2007.10.21: 16:00 星期日', lte: '2007.10.21: 22:00 星期日' }
    },
    {
      id: 'FixedPlot2',
      plotKind: 'fixed',
      end: '2007.10.22: 10:00 星期一',
      range: { gt: '2007.10.21: 22:00 星期日', lte: '2007.10.22: 8:00 星期一' }
    },
    {
      id: 'FreePlot3',
      plotKind: 'free',
      end: '2007.10.23: 10:00 星期二',
      range: { gt: '2007.10.22: 8:00 星期一', lte: '2007.10.23: 8:00 星期二' }
    },
    {
      id: 'FixedPlot3',
      plotKind: 'fixed',
      end: '2007.10.23: 12:00 星期二',
      range: { gt: '2007.10.23: 8:00 星期二', lte: '2007.10.23: 10:00 星期二' }
    },
    {
      id: 'FreePlot4',
      plotKind: 'free',
      end: '2007.10.23: 17:00 星期二',
      range: { gt: '2007.10.23: 10:00 星期二', lte: '2007.10.23: 14:00 星期二' }
    },
    {
      id: 'FixedPlot4',
      plotKind: 'fixed',
      end: '2007.10.23: 17:30 星期二',
      range: { gt: '2007.10.23: 14:00 星期二', lte: '2007.10.23: 17:00 星期二' }
    }
  ];
  const currentTime = state.timeline && state.timeline.currentTime;
  const slot = slots.find((item) => inTimelineRange(currentTime, item.range)) || slots[0];
  return {
    chapter: 'chapter_1',
    plotFile: 'plot.chapter.1',
    plotType: slot.id,
    plotKind: slot.plotKind,
    end: slot.end
  };
}
