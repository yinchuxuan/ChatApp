import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import GameCardBgmPlayer from '../../src/renderer/components/GameCardBgmPlayer';

const card = {
  id: 'wa2',
  audio: {
    bgm: {
      intro: 'audio/intro.mp3',
      sad: 'audio/sad.mp3',
      dream: 'audio/dream.ogg'
    }
  }
};

function request(id, key) {
  return {
    id,
    card,
    state: { audio: { bgm: key } }
  };
}

describe('GameCardBgmPlayer explicit updates', () => {
  let playResolvers;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    playResolvers = [];
    global.platformMock.getGameCardAudioUrl.mockImplementation(async (_cardId, path) => ({
      success: true,
      url: `local:///${path}`
    }));
    jest.spyOn(window.HTMLMediaElement.prototype, 'play')
      .mockImplementation(() => new Promise(resolve => playResolvers.push(resolve)));
    jest.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    window.HTMLMediaElement.prototype.play.mockRestore();
    window.HTMLMediaElement.prototype.pause.mockRestore();
  });

  async function finishPlay() {
    const previousPlayCount = window.HTMLMediaElement.prototype.play.mock.calls.length;
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    await act(async () => jest.advanceTimersByTime(999));
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(previousPlayCount);
    await act(async () => jest.advanceTimersByTime(1));
    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(previousPlayCount + 1);
    await act(async () => playResolvers.splice(0).forEach(resolve => resolve()));
  }

  test('loads and plays BGM only after an explicit update request', async () => {
    const { rerender } = render(React.createElement(GameCardBgmPlayer));
    expect(global.platformMock.getGameCardAudioUrl).not.toHaveBeenCalled();

    rerender(React.createElement(GameCardBgmPlayer, {
      updateRequest: request(1, 'intro')
    }));
    await finishPlay();

    expect(global.platformMock.getGameCardAudioUrl)
      .toHaveBeenCalledWith('wa2', 'audio/intro.mp3');
    expect(document.querySelector('audio').getAttribute('src'))
      .toBe('local:///audio/intro.mp3');
  });

  test('restarts the same BGM without resolving its URL again', async () => {
    const { rerender } = render(React.createElement(GameCardBgmPlayer, {
      updateRequest: request(1, 'intro')
    }));
    await finishPlay();
    document.querySelector('audio').currentTime = 12;

    rerender(React.createElement(GameCardBgmPlayer, {
      updateRequest: request(2, 'intro')
    }));
    await finishPlay();

    expect(global.platformMock.getGameCardAudioUrl).toHaveBeenCalledTimes(1);
    expect(document.querySelector('audio').currentTime).toBe(0);
  });

  test('restarts the same BGM after playback was stopped', async () => {
    const initialRequest = request(1, 'intro');
    const { rerender } = render(React.createElement(GameCardBgmPlayer, {
      updateRequest: initialRequest
    }));
    await finishPlay();
    rerender(React.createElement(GameCardBgmPlayer, {
      updateRequest: initialRequest,
      stopToken: 1
    }));
    rerender(React.createElement(GameCardBgmPlayer, {
      updateRequest: request(2, 'intro'),
      stopToken: 1
    }));
    await finishPlay();

    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(2);
  });

  test('ignores a stale URL after a newer BGM request', async () => {
    const resolvers = [];
    global.platformMock.getGameCardAudioUrl.mockImplementation(() => (
      new Promise(resolve => resolvers.push(resolve))
    ));
    const { rerender } = render(React.createElement(GameCardBgmPlayer, {
      updateRequest: request(1, 'sad')
    }));
    await waitFor(() => expect(resolvers).toHaveLength(1));
    rerender(React.createElement(GameCardBgmPlayer, {
      updateRequest: request(2, 'dream')
    }));
    await waitFor(() => expect(resolvers).toHaveLength(2));

    await act(async () => {
      resolvers[1]({ success: true, url: 'local:///dream.ogg' });
      resolvers[0]({ success: true, url: 'local:///sad.mp3' });
    });
    expect(document.querySelector('audio').getAttribute('src'))
      .toBe('local:///dream.ogg');
  });

  test('stops playback when the stop token changes', async () => {
    const { rerender } = render(React.createElement(GameCardBgmPlayer, {
      updateRequest: request(1, 'intro'),
      stopToken: 0
    }));
    await finishPlay();
    rerender(React.createElement(GameCardBgmPlayer, {
      updateRequest: request(1, 'intro'),
      stopToken: 1
    }));

    await waitFor(() => expect(window.HTMLMediaElement.prototype.pause).toHaveBeenCalled());
  });

  test('cancels a delayed playback when the stop token changes', async () => {
    const updateRequest = request(1, 'intro');
    const { rerender } = render(React.createElement(GameCardBgmPlayer, {
      updateRequest,
      stopToken: 0
    }));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      jest.advanceTimersByTime(500);
    });
    rerender(React.createElement(GameCardBgmPlayer, { updateRequest, stopToken: 1 }));
    await act(async () => jest.advanceTimersByTime(1000));

    expect(window.HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });

  test('manual button toggles playback without changing the request', async () => {
    render(React.createElement(GameCardBgmPlayer, {
      updateRequest: request(1, 'intro')
    }));
    await finishPlay();

    fireEvent.click(screen.getByRole('button', { name: '关闭 BGM' }));
    expect(screen.getByRole('button', { name: '开启 BGM' }))
      .toHaveTextContent('music_off');
    fireEvent.click(screen.getByRole('button', { name: '开启 BGM' }));
    await finishPlay();
  });

  test('keeps the control visible when the requested key is missing', async () => {
    render(React.createElement(GameCardBgmPlayer, {
      updateRequest: request(1, 'missing')
    }));
    await act(async () => Promise.resolve());

    expect(global.platformMock.getGameCardAudioUrl).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: '关闭 BGM' }))
      .toHaveTextContent('music_note');
  });
});
