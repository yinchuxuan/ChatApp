import { tauriBridge } from './tauriBridge.js';
import { invokeTauriCommand } from './tauriCommand.js';

const BACKGROUND_EVENT = 'background-config-changed';

function subscribeToBackground(listen, listener) {
  let disposed = false;
  let unlisten = null;
  const subscription = listen(BACKGROUND_EVENT, (event) => {
    const payload = event?.payload;
    listener(payload?.config ?? payload);
  });
  Promise.resolve(subscription)
    .then((nextUnlisten) => {
      if (disposed) nextUnlisten();
      else unlisten = nextUnlisten;
    })
    .catch(() => {});
  return () => {
    disposed = true;
    if (unlisten) unlisten();
  };
}

/** @returns {import('./contracts.js').RendererServices} */
function createTauriRendererServices(client = tauriBridge) {
  const call = (command, args, field) => invokeTauriCommand(client.invoke, command, args, field);
  return Object.freeze({
    config: Object.freeze({
      load: () => call('get_model_config', {}, 'config'),
      save: config => call('save_model_config', { config }, 'config')
    }),
    background: Object.freeze({
      load: () => call('get_background_config', {}, 'config'),
      save: config => call('save_background_config', { config }, 'config'),
      selectImage: () => call('select_background_image', {}, 'localUrl'),
      subscribe: listener => subscribeToBackground(client.listen, listener)
    }),
    sessions: Object.freeze({
      loadHistory: () => call('get_chat_history'),
      saveHistory: (messages, options) => call('save_chat_history', { messages, options }),
      list: () => call('list_chat_sessions'),
      getActive: () => call('get_active_chat_session', {}, 'session'),
      create: title => call('create_chat_session', { title }),
      setActive: id => call('set_active_chat_session', { id }),
      rename: (id, title) => call('rename_chat_session', { id, title }),
      delete: id => call('delete_chat_session', { id })
    }),
    cards: Object.freeze({
      importDirectory: () => call('import_game_card_from_directory', {}, 'card')
    })
  });
}

export { BACKGROUND_EVENT, createTauriRendererServices };
