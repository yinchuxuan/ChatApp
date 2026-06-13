const { prepareInitMessages, preparePreSendMessages } = require('../../src/gameCard/sendPipeline');

function readGameCardFile(cardId, filePath) {
  const files = {
    'files.json': JSON.stringify({ plot_guides: 'plot_guides.md' }),
    'plot_guides.md': '# Plot\n## FreePlot1\nloaded guide',
    'rules/tail.json': JSON.stringify([{
      id: 'tail',
      when: { phase: 'pre_send' },
      then: [{
        type: 'replace',
        predicate: { role: 'user', index: 'last' },
        content: '{{original_content}}\n{{file:plot_guides#FreePlot1}}'
      }]
    }])
  };
  return Promise.resolve({ success: true, content: files[filePath] || '' });
}

describe('game card send pipeline imports', () => {
  beforeEach(() => {
    window.electronAPI.readGameCardFile.mockImplementation(readGameCardFile);
  });

  test('expands imported files before applying pre_send replacements', async () => {
    const card = {
      version: '1',
      id: 'send-card',
      name: 'Send Card',
      files: { $import: 'files.json' },
      rules: [{ $import: 'rules/tail.json' }]
    };

    const result = await preparePreSendMessages({
      messages: [{ role: 'user', content: 'go' }],
      card
    });

    expect(result.trace.errors).toEqual([]);
    expect(result.messages[0].content).toBe('go\nloaded guide');
    expect(window.electronAPI.readGameCardFile)
      .toHaveBeenCalledWith('send-card', 'files.json');
    expect(window.electronAPI.readGameCardFile)
      .toHaveBeenCalledWith('send-card', 'plot_guides.md');
  });

  test('expands imports when initializing an existing history', async () => {
    const result = await prepareInitMessages({
      messages: [{ role: 'user', content: 'existing' }],
      card: {
        version: '1',
        id: 'send-card',
        name: 'Send Card',
        files: { $import: 'files.json' },
        rules: []
      }
    });

    expect(result.card.files.plot_guides).toBe('plot_guides.md');
    expect(window.electronAPI.readGameCardFile)
      .toHaveBeenCalledWith('send-card', 'files.json');
  });
});
