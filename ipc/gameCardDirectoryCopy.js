const path = require('path');

function makeTempDir(targetDir) {
  const parent = path.dirname(targetDir);
  const base = path.basename(targetDir);
  return path.join(parent, `.${base}-import-${Date.now()}-${process.pid}`);
}

function copyExistingSessions(fs, targetDir, tempDir) {
  const sessionsPath = path.join(targetDir, 'sessions');
  if (!fs.existsSync(sessionsPath)) return;
  const tempSessionsPath = path.join(tempDir, 'sessions');
  if (fs.existsSync(tempSessionsPath)) {
    fs.rmSync(tempSessionsPath, { recursive: true, force: true });
  }
  fs.cpSync(sessionsPath, tempSessionsPath, { recursive: true });
}

function copyCardDirectory(fs, sourceDir, targetDir) {
  const sourceReal = fs.realpathSync(sourceDir);
  const targetReal = fs.existsSync(targetDir) ? fs.realpathSync(targetDir) : null;
  if (targetReal && sourceReal === targetReal) return;

  const tempDir = makeTempDir(targetDir);
  fs.rmSync(tempDir, { recursive: true, force: true });
  fs.cpSync(sourceDir, tempDir, { recursive: true });
  if (fs.existsSync(targetDir)) copyExistingSessions(fs, targetDir, tempDir);
  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.renameSync(tempDir, targetDir);
}

module.exports = { copyCardDirectory };
