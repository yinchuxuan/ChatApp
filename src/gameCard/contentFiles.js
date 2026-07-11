import {
  FILE_PATH_PATTERN,
  resolveFileSource as resolveCoreFileSource,
  validateContentFiles
} from '../../shared/game-card/content/contentFiles.js';
import { withPlatformFileReader } from './platformFileReader.js';

function resolveFileSource(ref, options = {}) {
  return resolveCoreFileSource(ref, withPlatformFileReader(options));
}

export { FILE_PATH_PATTERN, resolveFileSource, validateContentFiles };
