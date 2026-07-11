import { createMemoryGameCardPlatform } from '../../src/platform/memoryGameCardPlatform.js';
import { createTauriGameCardPlatform } from '../../src/platform/tauriGameCardPlatform.js';
import { verifyGameCardPlatform } from './adapterContracts.js';

function tauriPlatform() {
  const values = {
    read_game_card_file: 'text',
    get_active_game_card: { id: 'card' }
  };
  return createTauriGameCardPlatform({
    invoke: async command => values[command],
    convertFileSrc: path => path.includes('/image/') ? 'asset://image' : 'asset://audio'
  });
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
  ['Tauri', tauriPlatform],
  ['memory', memoryPlatform]
])('%s game card adapter', (_name, createPlatform) => {
  test('implements the shared contract', async () => {
    await verifyGameCardPlatform(createPlatform());
  });
});
