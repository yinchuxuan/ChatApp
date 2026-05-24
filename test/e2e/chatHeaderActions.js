async function revealChatHeader(appHelper) {
  await appHelper.evaluate(() => {
    const trigger = document.querySelector('.chat-header-hover-trigger');
    if (trigger) {
      trigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      trigger.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    }
  });
  await appHelper.waitForSelector('.chat-header-visible', { state: 'visible', timeout: 5000 });
}

async function clickChatHeader(appHelper) {
  await revealChatHeader(appHelper);
  await appHelper.evaluate(() => document.querySelector('.chat-header-clickable')?.click());
}

async function getChatHeaderTitle(appHelper) {
  return await appHelper.evaluate(() => {
    const title = document.querySelector('.chat-header .header-title');
    return title ? title.textContent : '';
  });
}

async function revealChatInput(appHelper) {
  await appHelper.evaluate(() => {
    const trigger = document.querySelector('.chat-input-hover-trigger');
    if (trigger) {
      trigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
      trigger.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
    }
  });
  await appHelper.waitForSelector('.chat-input-area-visible .chat-input-textarea', {
    state: 'visible',
    timeout: 5000
  });
}

module.exports = {
  revealChatHeader,
  clickChatHeader,
  getChatHeaderTitle,
  revealChatInput
};
