const path = require('path');

function makeTempDir(targetDir) {
  const parent = path.dirname(targetDir);
  const base = path.basename(targetDir);
  return path.join(parent, `.${base}-import-${Date.now()}-${process.pid}`);
}

async function copyExistingSessions(store, targetDir, tempDir) {
  const sessionsPath = path.join(targetDir, 'sessions');
  if (!(await store.exists(sessionsPath))) return;
  const tempSessionsPath = path.join(tempDir, 'sessions');
  await store.io.rm(tempSessionsPath, { recursive: true, force: true });
  await store.io.cp(sessionsPath, tempSessionsPath, { recursive: true });
}

async function copyCardDirectory(store, sourceDir, targetDir) {
  const sourceReal = await store.io.realpath(sourceDir);
  const targetReal = await store.exists(targetDir) ? await store.io.realpath(targetDir) : null;
  if (targetReal && sourceReal === targetReal) return;

  const tempDir = makeTempDir(targetDir);
  await store.io.rm(tempDir, { recursive: true, force: true });
  try {
    await store.io.cp(sourceDir, tempDir, { recursive: true });
    if (targetReal) await copyExistingSessions(store, targetDir, tempDir);
    await store.io.rm(targetDir, { recursive: true, force: true });
    await store.io.rename(tempDir, targetDir);
  } catch (error) {
    await store.io.rm(tempDir, { recursive: true, force: true });
    throw error;
  }
}

module.exports = { copyCardDirectory };
