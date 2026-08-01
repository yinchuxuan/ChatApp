import { act, renderHook } from '@testing-library/react';
import useGameCardPresentation from '../../src/renderer/chat/useGameCardPresentation.js';

describe('useGameCardPresentation scene updates', () => {
  test('refreshes both the base image and portrait when scene changes', () => {
    const card = { id: 'visual-card' };
    const state = { visual: { scene: 'invite', portraits: { touma: 'normal' } } };
    const { result } = renderHook(() => useGameCardPresentation());

    act(() => result.current.updateChanged(card, state, ['visual.scene']));

    expect(result.current.backgroundRequest).toMatchObject({ card, state });
    expect(result.current.portraitRequest).toMatchObject({ card, state });
  });

  test('refreshes the effective portrait with a manual background update', () => {
    const card = { id: 'visual-card' };
    const state = { visual: { scene: 'invite', portraits: { touma: 'normal' } } };
    const { result } = renderHook(() => useGameCardPresentation());

    act(() => result.current.applyEffects([
      { type: 'visual.updateBackground' }
    ], { card, state }));

    expect(result.current.backgroundRequest).toMatchObject({ card, state });
    expect(result.current.portraitRequest).toMatchObject({ card, state });
  });

  test('publishes BGM updates without playback options', () => {
    const card = { id: 'audio-card' };
    const state = { audio: { bgm: 'intro' } };
    const { result } = renderHook(() => useGameCardPresentation());

    act(() => result.current.updateChanged(card, state, ['audio.bgm']));

    expect(result.current.bgmRequest).toMatchObject({ card, state });
    expect(result.current.bgmRequest).not.toHaveProperty('restart');
  });
});
