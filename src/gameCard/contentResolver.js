import { resolveContent as resolveCoreContent } from '../../shared/game-card/content/contentResolver.js';
import { withPlatformFileReader } from './platformFileReader.js';

function resolveContent(content, originalMessage = {}, options = {}) {
  return resolveCoreContent(content, originalMessage, withPlatformFileReader(options));
}

export { resolveContent };
