/* eslint-disable no-unused-vars */
/* global inTimelineRange */
/* exported resolveChapter2Timeline */

function resolveChapter2Timeline(state) {
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
      range: { gt: '2007.10.25: 17:30 星期五', lte: '2007.10.29: 14:00 星期一' }
    },
    {
      id: 'FixedPlot2',
      bgm: 'snow_scene',
      background: 'park',
      end: '2007.10.29: 18:00 星期一',
      range: { gt: '2007.10.29: 14:00 星期一', lte: '2007.10.29: 17:00 星期一' }
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
      range: { gt: '2007.10.29: 18:00 星期一', lte: '2007.10.31: 14:00 星期三' }
    },
    {
      id: 'FixedPlot4',
      bgm: 'after_all_piano',
      background: 'touma_hand',
      end: '2007.10.31: 17:30 星期三',
      range: { gt: '2007.10.31: 14:00 星期三', lte: '2007.10.31: 17:00 星期三' }
    },
    {
      id: 'FreePlot3',
      end: '2007.11.4: 15:00 星期日',
      range: { gt: '2007.10.31: 17:00 星期三', lte: '2007.11.4: 15:00 星期日' }
    }
  ];
  const currentTime = state.timeline && state.timeline.currentTime;
  const slot = slots.find((item) => inTimelineRange(currentTime, item.range)) || slots[0];
  return {
    chapter: 'chapter_2',
    plotFile: 'plot.chapter.2',
    plotType: slot.id,
    plotKind: slot.bgm ? 'fixed' : 'free',
    bgm: slot.bgm,
    background: slot.background,
    end: slot.end
  };
}
