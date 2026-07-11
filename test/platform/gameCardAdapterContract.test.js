import { createElectronGameCardPlatform } from '../../src/platform/electronGameCardPlatform.js';
import { createMemoryGameCardPlatform } from '../../src/platform/memoryGameCardPlatform.js';
import { createTauriGameCardPlatform } from '../../src/platform/tauriGameCardPlatform.js';
import { verifyGameCardPlatform } from './adapterContracts.js';

function electronPlatform() {
  return createElectronGameCardPlatform({
    readGameCardFile: async () => ({ success: true, content: 'text' }),
    getGameCardImageUrl: async () => ({ success: true, url: 'asset://image' }),
    getGameCardAudioUrl: async () => ({ success: true, url: 'asset://audio' }),
    getActiveGameCard: async () => ({ success: true, card: { id: 'card' } })
  });
}

function tauriPlatform() {
  const values = {
    read_game_card_file: 'text',
    get_game_card_image_url: 'asset://image',
    get_game_card_audio_url: 'asset://audio',
    get_active_game_card: { id: 'card' }
  };
  return createTauriGameCardPlatform({ invoke: async command => values[command] });
}

function memoryPlatform() {
  return createMemoryGameCardPlatform({
    activeCard: { id: 'card' },
    files: { 'text.md': 'text' },
    imageUrls: { 'image.png': 'asset://image' },
    audioUrls: { 'audio.mp3': 'asset://audio' }
  });
}

describe.each([
  ['Electron', electronPlatform],
  ['Tauri', tauriPlatform],
  ['memory', memoryPlatform]
])('%s game card adapter', (_name, createPlatform) => {
  test('implements the shared contract', async () => {
    await verifyGameCardPlatform(createPlatform());
  });
});
