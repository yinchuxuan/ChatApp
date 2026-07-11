/* global browser, $, $$ */

const { refreshApp, resetNoCard, saveHistory } = require('./support/tauri');

async function inject(messages) {
  await saveHistory(messages);
  await refreshApp();
}

describe('Tauri retry button', () => {
  beforeEach(async () => {
    await resetNoCard();
  });

  it('should not show a retry button without messages', async () => {
    expect((await $$('.retry-btn')).length).toBe(0);
  });

  it('should expose a retry button on the last user message', async () => {
    await inject([
      { role: 'user', content: 'What is JavaScript?' },
      { role: 'assistant', content: 'JavaScript is a language.', _thinking: 'Thinking' }
    ]);
    await expect($('.retry-btn')).toExist();
    expect(await $('.retry-btn').getAttribute('aria-label')).toBe('重新生成回复');
  });

  it('should render only one retry button in a multi-turn conversation', async () => {
    await inject([
      { role: 'user', content: 'First question' },
      { role: 'assistant', content: 'First answer' },
      { role: 'user', content: 'Second question' },
      { role: 'assistant', content: 'Second answer' }
    ]);
    expect((await $$('.retry-btn')).length).toBe(1);
    const result = await browser.execute(() => (
      [...document.querySelectorAll('.chat-message-row')]
        .filter(row => row.querySelector('.retry-btn'))
        .map(row => Boolean(row.querySelector('.chat-message.user')))
    ));
    expect(result).toEqual([true]);
  });

  it('should use the refresh icon and button styling', async () => {
    await inject([
      { role: 'user', content: 'Test question' },
      { role: 'assistant', content: 'Test answer' }
    ]);
    const info = await browser.execute(() => {
      const button = document.querySelector('.retry-btn');
      return {
        icon: button?.querySelector('.material-icons')?.textContent,
        styled: button?.classList.contains('md-btn'),
        title: button?.getAttribute('title')
      };
    });
    expect(info).toEqual({ icon: 'refresh', styled: true, title: '重新生成' });
  });
});
