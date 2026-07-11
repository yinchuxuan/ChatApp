import { createElectronGameCardPlatform } from './electronGameCardPlatform.js';
import { createElectronRendererServices } from './electronRendererServices.js';

const gameCardPlatform = createElectronGameCardPlatform();
const rendererServices = createElectronRendererServices();

export { gameCardPlatform, rendererServices };
