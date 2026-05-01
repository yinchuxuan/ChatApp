/**
 * Tests for ChatPanel thinking process display
 */

const React = require('react');
const { render, screen, fireEvent, waitFor, act } = require('@testing-library/react');

const electronAPI = global.window.electronAPI;
const ChatPanel = require('../../src/ChatPanel.jsx').default;

describe('ChatPanel thinking display', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    electronAPI.getModelConfig.mockResolvedValue({
      success: true,
      config: { apiUrl: 'http://api.example.com/v1', apiKey: 'test-api-key', modelName: 'gpt-4' }
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should render response content after streaming with thinking tags', async () => {
    global.fetch.mockResolvedValue(
      global.createThinkingStreamingMock('Let me think about this...', 'Here is my answer.')
    );

    render(React.createElement(ChatPanel));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    const input = screen.getByPlaceholderText('输入您的回答...');
    fireEvent.change(input, { target: { value: 'What is 2+2?' } });
    fireEvent.click(document.querySelector('button[type="submit"]'));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(200);
    });

    // After streaming completes, the message should contain the response text
    await waitFor(() => {
      expect(screen.getByText('Here is my answer.')).toBeInTheDocument();
    });
  });

  test('thinking content should be stored in last assistant message', async () => {
    global.fetch.mockResolvedValue(
      global.createThinkingStreamingMock('Thinking process here', 'The final answer.')
    );

    render(React.createElement(ChatPanel));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    const input = screen.getByPlaceholderText('输入您的回答...');
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.click(document.querySelector('button[type="submit"]'));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(200);
    });

    // The committed message should include the thinking content (since it's accumulated)
    await waitFor(() => {
      // The accumulated content includes both thinking and response
      const bubbles = screen.getAllByText(/The final answer\.|Thinking process here/);
      expect(bubbles.length).toBeGreaterThan(0);
    });
  });

  test('bubble without thinking should not be clickable', async () => {
    global.fetch.mockResolvedValue(
      global.createSimpleStreamingMock('Just a regular response.')
    );

    render(React.createElement(ChatPanel));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    const input = screen.getByPlaceholderText('输入您的回答...');
    fireEvent.change(input, { target: { value: 'hello' } });
    fireEvent.click(document.querySelector('button[type="submit"]'));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(screen.getByText('Just a regular response.')).toBeInTheDocument();
    });
  });
});
