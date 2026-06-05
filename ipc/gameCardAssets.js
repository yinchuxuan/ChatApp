const path = require('path');
const { isSafeGameCardId } = require('./gameCardStorage');

const AUDIO_EXTENSIONS = new Set(['.mp3', '.ogg', '.wav', '.m4a']);
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp']);

function getCardAssetPath(fs, cardsDir, id, relativePath, label = 'file_content') {
  if (!isSafeGameCardId(id)) throw new Error('Invalid game card id');
  if (path.isAbsolute(relativePath)) throw new Error(`${label} path must be relative`);
  const baseDir = path.resolve(cardsDir, id);
  const filePath = path.resolve(baseDir, relativePath);
  if (filePath !== baseDir && !filePath.startsWith(baseDir + path.sep)) {
    throw new Error(`${label} path must stay inside game card directory`);
  }
  if (fs.existsSync(filePath)) {
    const realPath = fs.realpathSync(filePath);
    const realBaseDir = fs.existsSync(baseDir) ? fs.realpathSync(baseDir) : baseDir;
    if (realPath !== realBaseDir && !realPath.startsWith(realBaseDir + path.sep)) {
      throw new Error(`${label} path must stay inside game card directory`);
    }
  }
  if (!fs.existsSync(filePath)) throw new Error(`${label} file not found`);
  return filePath;
}

function assertAudioExtension(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!AUDIO_EXTENSIONS.has(ext)) throw new Error('audio path must use mp3, ogg, wav, or m4a');
}

function getCardAudioPath(fs, cardsDir, id, relativePath) {
  const filePath = getCardAssetPath(fs, cardsDir, id, relativePath, 'audio');
  assertAudioExtension(filePath);
  return filePath;
}

function assertImageExtension(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (!IMAGE_EXTENSIONS.has(ext)) throw new Error('image path must use png, jpg, jpeg, webp, gif, or bmp');
}

function getCardImagePath(fs, cardsDir, id, relativePath) {
  const filePath = getCardAssetPath(fs, cardsDir, id, relativePath, 'image');
  assertImageExtension(filePath);
  return filePath;
}

module.exports = { AUDIO_EXTENSIONS, IMAGE_EXTENSIONS, getCardAssetPath, getCardAudioPath, getCardImagePath };
