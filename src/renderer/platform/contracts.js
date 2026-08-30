/** @typedef {Record<string, unknown>} JsonObject */
/** @typedef {JsonObject & {id?: string}} GameCard */

/**
 * @typedef {Object} GameCardResources
 * @property {(cardId: string, relativePath: string) => Promise<string>} readText
 * @property {(cardId: string, relativePath: string) => Promise<string>} getImageUrl
 * @property {(cardId: string, relativePath: string) => Promise<string>} getAudioUrl
 */

/** @typedef {{getActiveCard: () => Promise<GameCard|null>}} GameCardRepository */
/** @typedef {{run: (source: string, context: JsonObject, options?: JsonObject) => unknown}} ScriptExecutor */
/** @typedef {{resources: GameCardResources, repository: GameCardRepository, scriptExecutor: ScriptExecutor}} GameCardPlatform */
/** @typedef {GameCardPlatform} GameCardPlatformOptions */

/** @typedef {{load: () => Promise<JsonObject>, save: (value: JsonObject) => Promise<JsonObject>}} ConfigService */
/**
 * @typedef {Object} BackgroundService
 * @property {() => Promise<JsonObject>} load
 * @property {(value: JsonObject) => Promise<JsonObject>} save
 * @property {() => Promise<string>} selectImage
 * @property {(listener: (value: JsonObject) => void) => (() => void)} subscribe
 */
/** @typedef {Record<string, (...args: any[]) => Promise<any>>} SessionRepository */
/**
 * @typedef {Object} CardRepository
 * @property {() => Promise<GameCard[]>} list
 * @property {(id: string|null) => Promise<unknown>} setActive
 * @property {() => Promise<GameCard|null>} importDirectory
 * @property {() => Promise<GameCard|null>} importFile
 */
/** @typedef {{isFullscreen: () => Promise<boolean>, setFullscreen: (value: boolean) => Promise<void>}} WindowService */
/**
 * @typedef {Object} RendererServices
 * @property {ConfigService} config
 * @property {BackgroundService} background
 * @property {SessionRepository} sessions
 * @property {CardRepository} cards
 * @property {WindowService} window
 */

export {};
