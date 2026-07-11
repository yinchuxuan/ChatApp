import { createElectronGameCardPlatform } from '../../src/platform/electronGameCardPlatform.js';

describe('Electron game card platform contract', () => {
  test('passes card ids to every resource boundary', async () => {
    const api = {
      readGameCardFile: jest.fn(async () => ({ success: true, content: 'text' })),
      getGameCardImageUrl: jest.fn(async () => ({ success: true, url: 'local://image' })),
      getGameCardAudioUrl: jest.fn(async () => ({ success: true, url: 'local://audio' })),
      getActiveGameCard: jest.fn(async () => ({ success: true, card: { id: 'card', rules: [] } }))
    };
    const platform = createElectronGameCardPlatform(api);

    await expect(platform.resources.readText('card', 'text.md')).resolves.toBe('text');
    await expect(platform.resources.getImageUrl('card', 'image.png')).resolves.toBe('local://image');
    await expect(platform.resources.getAudioUrl('card', 'audio.mp3')).resolves.toBe('local://audio');
    await expect(platform.repository.getActiveCard()).resolves.toEqual({ id: 'card', rules: [] });
    expect(api.getGameCardImageUrl).toHaveBeenCalledWith('card', 'image.png');
    expect(api.getGameCardAudioUrl).toHaveBeenCalledWith('card', 'audio.mp3');
  });

  test('returns only card or null from the repository', async () => {
    const api = {
      readGameCardFile: jest.fn(), getGameCardImageUrl: jest.fn(), getGameCardAudioUrl: jest.fn(),
      getActiveGameCard: jest.fn(async () => ({ success: true, gameCard: { id: 'legacy' } }))
    };
    await expect(createElectronGameCardPlatform(api).repository.getActiveCard()).resolves.toBeNull();
  });
});
