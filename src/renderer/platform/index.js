import { createTauriGameCardPlatform } from './tauriGameCardPlatform.js';
import { createTauriRendererServices } from './tauriRendererServices.js';

const gameCardPlatform = createTauriGameCardPlatform();
const rendererServices = createTauriRendererServices();

export { gameCardPlatform, rendererServices };
