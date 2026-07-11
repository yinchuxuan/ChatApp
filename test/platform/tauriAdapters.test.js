import { createTauriGameCardPlatform } from '../../src/platform/tauriGameCardPlatform.js';
import { BACKGROUND_EVENT, createTauriRendererServices } from '../../src/platform/tauriRendererServices.js';

describe('Tauri renderer adapters', () => {
  test('maps service calls to command names and named payloads', async () => {
    const invoke = jest.fn(async () => ({ success: true }));
    const services = createTauriRendererServices({ invoke, listen: jest.fn() });

    await services.config.save({ modelName: 'model' });
    await services.sessions.saveHistory([{ role: 'user' }], { gameState: { score: 1 } });
    await services.sessions.rename('session-1', 'Renamed');

    expect(invoke).toHaveBeenNthCalledWith(1, 'save_model_config', {
      config: { modelName: 'model' }
    });
    expect(invoke).toHaveBeenNthCalledWith(2, 'save_chat_history', {
      messages: [{ role: 'user' }], options: { gameState: { score: 1 } }
    });
    expect(invoke).toHaveBeenNthCalledWith(3, 'rename_chat_session', {
      id: 'session-1', title: 'Renamed'
    });
  });

  test('maps resource calls and accepts command result envelopes', async () => {
    const invoke = jest.fn(async command => ({
      success: true,
      content: command === 'read_game_card_file' ? 'text' : undefined,
      url: command.includes('image') ? 'asset://image' : 'asset://audio',
      card: command === 'get_active_game_card' ? { id: 'card' } : undefined
    }));
    const platform = createTauriGameCardPlatform({ invoke });

    await platform.resources.readText('card', 'content.md');
    await platform.resources.getImageUrl('card', 'image.png');
    await platform.repository.getActiveCard();

    expect(invoke).toHaveBeenNthCalledWith(1, 'read_game_card_file', {
      cardId: 'card', relativePath: 'content.md'
    });
    expect(invoke).toHaveBeenNthCalledWith(2, 'get_game_card_image_url', {
      cardId: 'card', relativePath: 'image.png'
    });
  });

  test('normalizes rejected and business errors with validation details', async () => {
    const failure = { error: 'invalid card', stage: 'validate', file: 'card.json', details: [{ message: 'bad' }] };
    const rejected = createTauriGameCardPlatform({ invoke: async () => { throw failure; } });
    const business = createTauriRendererServices({
      invoke: async () => ({ success: false, error: 'canceled', canceled: true }),
      listen: jest.fn()
    });

    await expect(rejected.repository.getActiveCard()).rejects.toMatchObject({
      message: 'invalid card', stage: 'validate', file: 'card.json', details: failure.details
    });
    await expect(business.cards.importDirectory()).rejects.toMatchObject({
      message: 'canceled', canceled: true
    });
  });

  test('subscribes to background events and handles early disposal', async () => {
    let eventListener;
    let resolveUnlisten;
    const unlisten = jest.fn();
    const listen = jest.fn((_event, listener) => {
      eventListener = listener;
      return new Promise(resolve => { resolveUnlisten = resolve; });
    });
    const onChange = jest.fn();
    const unsubscribe = createTauriRendererServices({ invoke: jest.fn(), listen })
      .background.subscribe(onChange);

    eventListener({ payload: { config: { opacity: 0.5 } } });
    unsubscribe();
    resolveUnlisten(unlisten);
    await Promise.resolve();

    expect(listen).toHaveBeenCalledWith(BACKGROUND_EVENT, expect.any(Function));
    expect(onChange).toHaveBeenCalledWith({ opacity: 0.5 });
    expect(unlisten).toHaveBeenCalled();
  });
});
