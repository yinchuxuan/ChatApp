import { createElectronGameCardPlatform } from './electronGameCardPlatform.js';
import { createElectronRendererServices } from './electronRendererServices.js';

/** @type {import('./contracts.js').GameCardPlatform} */
const gameCardPlatform = createElectronGameCardPlatform();
/** @type {import('./contracts.js').RendererServices} */
const rendererServices = createElectronRendererServices();

export { gameCardPlatform, rendererServices };
