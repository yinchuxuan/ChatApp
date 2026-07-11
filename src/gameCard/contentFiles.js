import {
  resolveFileSource as resolveCoreFileSource
} from '../../shared/game-card/content/contentFiles.js';
import { withPlatformFileReader } from './platformFileReader.js';

function resolveFileSource(ref, options = {}) {
  return resolveCoreFileSource(ref, withPlatformFileReader(options));
}

export { resolveFileSource };
