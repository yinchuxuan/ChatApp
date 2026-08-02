const React = require('react');
const { act, fireEvent, render, screen, waitFor } = require('@testing-library/react');
const ChatPanel = require('../../src/renderer/ChatPanel.jsx').default;

function cardResult() {
  const enumField = (values, value) => ({
    type: 'enum',
    values,
    default: value,
    llmRead: true,
    llmWrite: true
  });
  return {
    success: true,
    card: {
      version: '1',
      id: 'timeline-card',
      name: 'Timeline Card',
      display: { segmentedReading: true },
      visual: {
        background: { old: 'old.jpg', first: 'first.jpg', second: 'second.jpg' },
        portrait: { hero: { normal: 'hero.png' } }
      },
      audio: { bgm: { calm: 'calm.mp3', tense: 'tense.mp3' } },
      state: {
        schema: {
          schema: {
            'visual.scene': enumField(['old', 'first', 'second'], 'old'),
            'visual.portraits': {
              type: 'object',
              properties: { hero: enumField(['normal'], 'normal') },
              additionalProperties: false,
              maxProperties: 4,
              default: {},
              llmRead: true,
              llmWrite: true
            },
            'audio.bgm': enumField(['none', 'calm', 'tense'], 'calm')
          }
        }
      },
      rules: []
    }
  };
}

function streamResponse(content) {
  const payload = JSON.stringify({ choices: [{ delta: { content } }] });
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    }
  });
  return { ok: true, body: { getReader: () => stream.getReader() } };
}

function controlledStreamResponse(content) {
  let finish;
  const payload = JSON.stringify({ choices: [{ delta: { content } }] });
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      finish = () => {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      };
    }
  });
  return {
    finish: () => finish(),
    response: { ok: true, body: { getReader: () => stream.getReader() } }
  };
}

function VisualProbe({ backgroundRequest, portraitRequest }) {
  return React.createElement('output', {
    'data-testid': 'visual-state',
    'data-background': backgroundRequest?.state?.visual?.scene || '',
    'data-portrait': JSON.stringify(portraitRequest?.state?.visual?.portraits || {})
  });
}

function AudioProbe({ updateRequest }) {
  return React.createElement('output', {
    'data-testid': 'audio-state',
    'data-bgm': updateRequest?.state?.audio?.bgm || ''
  });
}

function patch(actions) {
  return `<state_patch>${JSON.stringify(actions)}</state_patch>`;
}

describe('ChatPanel segmented state patch timeline', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.platformMock.getModelConfig.mockResolvedValue({
      success: true,
      config: { apiUrl: 'http://api.example.com', apiKey: 'key', modelName: 'model' }
    });
    global.platformMock.getChatHistory.mockResolvedValue({ success: true, messages: [] });
    global.platformMock.getActiveGameCard.mockResolvedValue(cardResult());
  });

  test('publishes scene changes only when the reading cursor reaches them', async () => {
    const opening = patch([
      { type: 'state.set', path: 'visual.scene', value: 'first' }
    ]);
    const nextScene = patch([
      { type: 'state.set', path: 'visual.scene', value: 'second' },
      { type: 'state.set', path: 'visual.portraits', value: { hero: 'normal' } },
      { type: 'state.set', path: 'audio.bgm', value: 'tense' }
    ]);
    global.fetch.mockResolvedValue(streamResponse(
      `${opening}\n\n第一段。\n\n${nextScene}\n\n第二段。`
    ));

    const { container } = render(React.createElement(ChatPanel, {
      BackgroundRuntime: VisualProbe,
      BgmPlayer: AudioProbe
    }));
    await screen.findByText('Timeline Card');
    const input = screen.getByPlaceholderText('输入您的回答...');
    fireEvent.change(input, { target: { value: '继续' } });
    fireEvent.submit(input.closest('form'));

    await screen.findByText('第一段。');
    await waitFor(() => {
      expect(screen.getByTestId('visual-state')).toHaveAttribute('data-background', 'first');
    });
    expect(screen.getByTestId('visual-state')).toHaveAttribute('data-portrait', '{}');
    expect(screen.getByTestId('audio-state')).toHaveAttribute('data-bgm', 'calm');

    fireEvent.click(container.querySelector('[data-gc-part="chat-panel"]'));
    await screen.findByText('第二段。');
    await waitFor(() => {
      expect(screen.getByTestId('visual-state')).toHaveAttribute('data-background', 'second');
      expect(screen.getByTestId('visual-state')).toHaveAttribute(
        'data-portrait',
        '{"hero":"normal"}'
      );
      expect(screen.getByTestId('audio-state')).toHaveAttribute('data-bgm', 'tense');
    });
  });

  test('keeps patches crossed while the response is still streaming', async () => {
    const opening = patch([
      { type: 'state.set', path: 'visual.scene', value: 'first' }
    ]);
    const nextScene = patch([
      { type: 'state.set', path: 'visual.scene', value: 'second' }
    ]);
    const controlled = controlledStreamResponse(
      `${opening}\n\n第一段。\n\n${nextScene}\n\n第二段。`
    );
    global.fetch.mockResolvedValue(controlled.response);
    const { container } = render(React.createElement(ChatPanel, {
      BackgroundRuntime: VisualProbe,
      BgmPlayer: AudioProbe
    }));
    await screen.findByText('Timeline Card');
    const input = screen.getByPlaceholderText('输入您的回答...');
    fireEvent.change(input, { target: { value: '继续' } });
    fireEvent.submit(input.closest('form'));
    await screen.findByText('第一段。');
    await act(async () => new Promise(resolve => setTimeout(resolve, 60)));

    fireEvent.click(container.querySelector('[data-gc-part="chat-panel"]'));
    await screen.findByText('第二段。');
    const streamingPage = container.querySelector('.segmented-reading-page');
    await waitFor(() => {
      expect(screen.getByTestId('visual-state')).toHaveAttribute('data-background', 'second');
    });
    act(() => controlled.finish());
    await waitFor(() => expect(input).not.toBeDisabled());
    expect(screen.getByTestId('visual-state')).toHaveAttribute('data-background', 'second');
    expect(container.querySelector('.segmented-reading-page')).toBe(streamingPage);
  });
});
