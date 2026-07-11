const path = require('path');

let temporaryFileSequence = 0;

function wrapStorageError(error, operation, filePath) {
  if (error?.storageOperation) return error;
  const wrapped = new Error(error?.message || String(error));
  wrapped.name = 'StorageError';
  wrapped.code = error?.code;
  wrapped.cause = error;
  wrapped.storageOperation = operation;
  wrapped.file = filePath;
  return wrapped;
}

function createIo(fs) {
  if (fs.promises) return fs.promises;
  return {
    access: async filePath => {
      if (!fs.existsSync(filePath)) {
        const error = new Error(`ENOENT: ${filePath}`);
        error.code = 'ENOENT';
        throw error;
      }
    },
    mkdir: async (filePath, options) => fs.mkdirSync(filePath, options),
    readFile: async (filePath, encoding) => fs.readFileSync(filePath, encoding),
    writeFile: async (filePath, content, encoding) => fs.writeFileSync(filePath, content, encoding),
    rename: async (source, target) => fs.renameSync(source, target),
    rm: async (filePath, options) => fs.rmSync?.(filePath, options),
    copyFile: async (source, target) => fs.copyFileSync(source, target),
    cp: async (source, target, options) => fs.cpSync(source, target, options),
    readdir: async filePath => fs.readdirSync(filePath),
    realpath: async filePath => fs.realpathSync(filePath)
  };
}

function createJsonStore(fs) {
  const io = createIo(fs);

  async function exists(filePath) {
    try {
      await io.access(filePath);
      return true;
    } catch (error) {
      if (error?.code === 'ENOENT') return false;
      throw wrapStorageError(error, 'access', filePath);
    }
  }

  async function ensureDir(dirPath) {
    try {
      await io.mkdir(dirPath, { recursive: true });
    } catch (error) {
      throw wrapStorageError(error, 'mkdir', dirPath);
    }
  }

  async function readText(filePath) {
    try {
      return await io.readFile(filePath, 'utf-8');
    } catch (error) {
      throw wrapStorageError(error, 'read', filePath);
    }
  }

  async function readJson(filePath, fallback) {
    if (!(await exists(filePath))) return fallback;
    try {
      return JSON.parse(await readText(filePath));
    } catch (error) {
      throw wrapStorageError(error, 'read-json', filePath);
    }
  }

  async function writeJson(filePath, value) {
    await ensureDir(path.dirname(filePath));
    const suffix = `${process.pid}-${Date.now()}-${temporaryFileSequence++}`;
    const temporaryPath = path.join(path.dirname(filePath), `.${path.basename(filePath)}.${suffix}.tmp`);
    try {
      await io.writeFile(temporaryPath, JSON.stringify(value, null, 2), 'utf-8');
      await io.rename(temporaryPath, filePath);
    } catch (error) {
      try {
        await io.rm(temporaryPath, { force: true });
      } catch {
        // Preserve the original storage failure.
      }
      throw wrapStorageError(error, 'write-json', filePath);
    }
  }

  return { ensureDir, exists, io, readJson, readText, writeJson };
}

module.exports = { createJsonStore, wrapStorageError };
