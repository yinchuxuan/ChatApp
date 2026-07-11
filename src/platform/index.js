import { createElectronGameCardPlatform } from './electronGameCardPlatform.js';
import { createElectronRendererServices } from './electronRendererServices.js';
import { createPlatformAdapters, getDesktopTarget } from './platformTarget.js';
import { createTauriGameCardPlatform } from './tauriGameCardPlatform.js';
import { createTauriRendererServices } from './tauriRendererServices.js';

const { gameCardPlatform, rendererServices } = createPlatformAdapters(getDesktopTarget(), {
  electron: {
    createGameCardPlatform: createElectronGameCardPlatform,
    createRendererServices: createElectronRendererServices
  },
  tauri: {
    createGameCardPlatform: createTauriGameCardPlatform,
    createRendererServices: createTauriRendererServices
  }
});

export { gameCardPlatform, rendererServices };
