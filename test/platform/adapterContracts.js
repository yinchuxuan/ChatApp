async function verifyRendererServices(services) {
  expect(await services.config.load()).toEqual(expect.any(Object));
  await services.config.save({ modelName: 'model' });
  expect(await services.background.load()).toEqual(expect.any(Object));
  await services.background.save({ opacity: 0.5 });
  await expect(services.background.selectImage()).resolves.toEqual(expect.any(String));
  expect(services.background.subscribe(() => {})).toEqual(expect.any(Function));
  await expect(services.sessions.loadHistory()).resolves.toEqual(expect.any(Object));
  await services.sessions.saveHistory([], {});
  expect(await services.sessions.list()).toEqual(expect.objectContaining({ sessions: expect.any(Array) }));
  await services.sessions.getActive();
  await services.sessions.create('Session');
  await services.sessions.setActive('session-1');
  await services.sessions.rename('session-1', 'Renamed');
  await services.sessions.delete('session-1');
  await services.cards.importDirectory();
  const fullscreen = await services.window.isFullscreen();
  await services.window.setFullscreen(!fullscreen);
  expect(await services.window.isFullscreen()).toBe(!fullscreen);
}

async function verifyGameCardPlatform(platform) {
  await expect(platform.resources.readText('card', 'text.md')).resolves.toBe('text');
  await expect(platform.resources.getImageUrl('card', 'image.png')).resolves.toBe('asset://image');
  await expect(platform.resources.getAudioUrl('card', 'audio.mp3')).resolves.toBe('asset://audio');
  await expect(platform.repository.getActiveCard()).resolves.toEqual({ id: 'card' });
  expect(platform.scriptExecutor.run).toEqual(expect.any(Function));
}

export { verifyGameCardPlatform, verifyRendererServices };
