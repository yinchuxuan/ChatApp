import {
  applyGameCard as applyCoreGameCard,
  cloneMessages
} from '../../shared/game-card/engine/engine.js';
import { runExecAction } from './execRunner.js';
import { createPlatformFileReader } from './platformFileReader.js';

function applyGameCard(options = {}) {
  const {
    contentBaseDir,
    dependencies = {},
    fs,
    path,
    ...coreOptions
  } = options;
  const platformOptions = { baseDir: contentBaseDir, fs, path };
  const readFile = dependencies.readFile || createPlatformFileReader(platformOptions);
  const execute = dependencies.runExecAction || ((messages, state, action, runtimeOptions) => (
    runExecAction(messages, state, action, { ...runtimeOptions, ...platformOptions })
  ));

  return applyCoreGameCard({
    ...coreOptions,
    dependencies: { readFile, runExecAction: execute }
  });
}

export { applyGameCard, cloneMessages };
