/* eslint-disable no-unused-vars */
/* global inTimelineRange */
/* exported resolveChapter2Timeline */

function resolveChapter2Timeline(state) {
  const slots = [
    {
      id: 'FixedPlot1',
      bgm: 'WA_3',
      background: 'rooftop',
      range: { gt: '2007.10.25: 16:00 星期四', lte: '2007.10.26: 8:00 星期五' }
    },
    { id: 'FreePlot1', range: { gt: '2007.10.26: 8:00 星期五', lte: '2007.10.29: 17:00 星期一' } },
    {
      id: 'FixedPlot2',
      bgm: 'daily',
      background: 'school',
      range: { gt: '2007.10.29: 17:00 星期一', lte: '2007.10.29: 18:00 星期一' }
    },
    {
      id: 'FixedPlot3',
      bgm: 'happy',
      background: 'school',
      range: { gt: '2007.10.29: 18:00 星期一', lte: '2007.10.29: 22:00 星期一' }
    },
    { id: 'FreePlot2', range: { gt: '2007.10.29: 22:00 星期一', lte: '2007.10.31: 17:00 星期三' } },
    {
      id: 'FixedPlot4',
      bgm: 'WA_piano',
      background: 'musical_classroom3',
      range: { gt: '2007.10.31: 17:00 星期三', lte: '2007.10.31: 17:30 星期三' }
    },
    { id: 'FreePlot3', range: { gt: '2007.10.31: 17:30 星期三', lte: '2007.11.4: 15:00 星期日' } }
  ];
  const currentTime = state.timeline && state.timeline.currentTime;
  const slot = slots.find((item) => inTimelineRange(currentTime, item.range)) || slots[0];
  return {
    chapter: 'chapter_2',
    plotFile: 'plot.chapter.2',
    plotType: slot.id,
    plotKind: slot.bgm ? 'fixed' : 'free',
    bgm: slot.bgm,
    background: slot.background
  };
}
