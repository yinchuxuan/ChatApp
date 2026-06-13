const { preparePreSendMessages } = require('../../src/gameCard/sendPipeline');

function dynamicFileCard() {
  return {
    version: '1',
    id: 'send-card',
    name: 'Send Card',
    content: { files: { plot1: 'chapters/chapter-1/plot.md' } },
    rules: [{
      when: { phase: 'pre_send' },
      then: [
        { type: 'state.set', path: 'temp.plotSection', value: 'Intro' },
        { type: 'state.set', path: 'temp.plotFile', value: 'plot1' },
        {
          type: 'insert',
          predicate: { index: 0 },
          anchor: 'before',
          role: 'system',
          content: '{{file:$temp.plotFile#$temp.plotSection}}'
        }
      ]
    }]
  };
}

describe('game card declared content file preload', () => {
  beforeEach(() => {
    window.electronAPI.readGameCardFile.mockClear();
  });

  test('preloads declared content files before applying dynamic file rules', async () => {
    window.electronAPI.readGameCardFile.mockResolvedValue({
      success: true,
      content: '## Intro\nloaded dynamic route'
    });

    const result = await preparePreSendMessages({
      messages: [{ role: 'user', content: 'start' }],
      card: dynamicFileCard()
    });

    expect(window.electronAPI.readGameCardFile)
      .toHaveBeenCalledWith('send-card', 'chapters/chapter-1/plot.md');
    expect(result.messages[0].content).toBe('loaded dynamic route');
  });
});
