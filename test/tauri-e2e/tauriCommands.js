/* global browser */

async function invoke(command, args = {}) {
  return browser.execute(async (name, payload) => {
    return window.__TAURI_INTERNALS__.invoke(name, payload);
  }, command, args);
}

async function sendMessage(content) {
  await browser.execute((value) => {
    const input = document.querySelector('.chat-input-textarea');
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, content);
  await browser.pause(20);
  await browser.execute(() => document.querySelector('.chat-input-area')?.requestSubmit());
}

module.exports = { invoke, sendMessage };
