import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import GameCardBgmPlayer from '../../src/components/GameCardBgmPlayer';

async function flushAudioEffects() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('GameCardBgmPlayer', () => {
  let playResolvers;

  beforeEach(() => {
    jest.clearAllMocks();
    playResolvers = [];
    window.electronAPI.getGameCardAudioUrl.mockResolvedValue({ success: true, url: 'local:///intro.mp3' });
    jest.spyOn(window.HTMLMediaElement.prototype, 'play').mockImplementation(() => new Promise(resolve => playResolvers.push(resolve)));
    jest.spyOn(window.HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
  });

  afterEach(() => {
    window.HTMLMediaElement.prototype.play.mockRestore();
    window.HTMLMediaElement.prototype.pause.mockRestore();
  });

  test('loads BGM from game state and plays from the beginning after resume token', async () => {
    const { rerender } = render(React.createElement(GameCardBgmPlayer, {
      card: { audio: { bgm: { intro: 'audio/intro.mp3' } } },
      gameState: { audio: { bgm: 'intro' } },
      resumeToken: 0
    }));
    await flushAudioEffects();
    await waitFor(() => expect(window.electronAPI.getGameCardAudioUrl).toHaveBeenCalledWith('audio/intro.mp3'));

    document.querySelector('audio').currentTime = 12;
    rerender(React.createElement(GameCardBgmPlayer, {
      card: { audio: { bgm: { intro: 'audio/intro.mp3' } } },
      gameState: { audio: { bgm: 'intro' } },
      resumeToken: 1
    }));
    await flushAudioEffects();

    await waitFor(() => expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled());
    await act(async () => { playResolvers.splice(0).forEach(resolve => resolve()); });
    expect(document.querySelector('audio').currentTime).toBe(0);
    expect(screen.getByRole('button', { name: '关闭 BGM' })).toHaveTextContent('music_note');
  });

  test('stops playback when stop token changes', async () => {
    const { rerender } = render(React.createElement(GameCardBgmPlayer, {
      card: { audio: { bgm: { intro: 'audio/intro.mp3' } } },
      gameState: { audio: { bgm: 'intro' } },
      resumeToken: 1,
      stopToken: 0
    }));
    await flushAudioEffects();
    await waitFor(() => expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled());
    await act(async () => { playResolvers.splice(0).forEach(resolve => resolve()); });

    rerender(React.createElement(GameCardBgmPlayer, {
      card: { audio: { bgm: { intro: 'audio/intro.mp3' } } },
      gameState: { audio: { bgm: 'intro' } },
      resumeToken: 1,
      stopToken: 1
    }));
    await flushAudioEffects();

    expect(window.HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  });

  test('waits for the latest bgm url before playing after resume', async () => {
    let resolveSad;
    window.electronAPI.getGameCardAudioUrl
      .mockResolvedValueOnce({ success: true, url: 'local:///intro.mp3' })
      .mockReturnValueOnce(new Promise(resolve => { resolveSad = resolve; }));
    const card = { audio: { bgm: { intro: 'audio/intro.mp3', sad: 'audio/sad.mp3' } } };
    const { rerender } = render(React.createElement(GameCardBgmPlayer, {
      card,
      gameState: { audio: { bgm: 'intro' } },
      resumeToken: 0
    }));
    await flushAudioEffects();
    await waitFor(() => expect(document.querySelector('audio').getAttribute('src')).toBe('local:///intro.mp3'));

    rerender(React.createElement(GameCardBgmPlayer, {
      card,
      gameState: { audio: { bgm: 'sad' } },
      resumeToken: 1
    }));
    await flushAudioEffects();

    expect(window.HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
    await act(async () => { resolveSad({ success: true, url: 'local:///sad.mp3' }); });
    await waitFor(() => expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1));
    expect(document.querySelector('audio').getAttribute('src')).toBe('local:///sad.mp3');
    expect(document.querySelector('audio').currentTime).toBe(0);
  });

  test('manual button toggles audio enabled state with music icons', async () => {
    render(React.createElement(GameCardBgmPlayer, {
      card: { audio: { bgm: { intro: 'audio/intro.mp3' } } },
      gameState: { audio: { bgm: 'intro' } }
    }));
    await flushAudioEffects();
    await waitFor(() => expect(screen.getByRole('button', { name: '关闭 BGM' })).toBeEnabled());

    fireEvent.click(screen.getByRole('button', { name: '关闭 BGM' }));
    expect(screen.getByRole('button', { name: '开启 BGM' })).toHaveTextContent('music_off');

    fireEvent.click(screen.getByRole('button', { name: '开启 BGM' }));

    expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalled();
    await act(async () => { playResolvers.splice(0).forEach(resolve => resolve()); });
    expect(screen.getByRole('button', { name: '关闭 BGM' })).toHaveTextContent('music_note');
  });

  test('keeps the toggle visible even when no audio source is resolved', async () => {
    render(React.createElement(GameCardBgmPlayer, {
      card: { audio: { bgm: {} } },
      gameState: { audio: { bgm: 'missing' } }
    }));
    await flushAudioEffects();

    const button = screen.getByRole('button', { name: '关闭 BGM' });
    expect(button).toHaveTextContent('music_note');
    expect(button).not.toBeDisabled();

    fireEvent.click(button);
    expect(screen.getByRole('button', { name: '开启 BGM' })).toHaveTextContent('music_off');
  });
});
