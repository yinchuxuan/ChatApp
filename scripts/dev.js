const { spawn } = require('child_process');
const electronPath = require('electron');

async function start() {
  const { createServer } = await import('vite');
  const server = await createServer({ configFile: 'vite.config.mjs' });
  await server.listen();

  const rendererUrl = server.resolvedUrls?.local?.[0];
  if (!rendererUrl) throw new Error('Vite did not expose a renderer URL');

  const electron = spawn(electronPath, ['.'], {
    env: { ...process.env, VITE_DEV_SERVER_URL: rendererUrl },
    stdio: 'inherit'
  });
  const stop = async (signal) => {
    if (!electron.killed) electron.kill(signal);
    await server.close();
  };

  electron.on('exit', async (code) => {
    await server.close();
    process.exitCode = code ?? 0;
  });
  process.on('SIGINT', () => stop('SIGINT'));
  process.on('SIGTERM', () => stop('SIGTERM'));
}

start().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
