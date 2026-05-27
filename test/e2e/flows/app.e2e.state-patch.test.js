const { test, expect } = require('@playwright/test');
const { setupHooks } = require('../mockApiTestHelpers');

test.describe.configure({ mode: 'serial' });

const { configureApp, send, openAiStream, getAppHelper } = setupHooks();

function statePatchCard() {
  return {
    version: '1.0',
    id: 'state_patch_e2e',
    name: 'State Patch E2E',
    rules: []
  };
}

function patchResponse(label) {
  return [
    `response ${label}`,
    '<state_patch>',
    `[{"type":"state.append","path":"events","value":"${label}"}]`,
    '</state_patch>'
  ].join('\n');
}

async function waitForHistoryEvents(expected) {
  await expect.poll(async () => {
    const history = await getAppHelper().getChatHistory();
    return history.gameState.events || [];
  }).toEqual(expected);
  return getAppHelper().getChatHistory();
}

async function clickRetry() {
  const page = getAppHelper().window;
  await page.locator('.chat-message.user').last().hover();
  await page.locator('.retry-btn').click();
}

test('applies assistant state_patch and retries from the saved state snapshot', async () => {
  await configureApp(statePatchCard());
  const requests = [];
  const responses = [patchResponse('first'), patchResponse('retry')];

  await getAppHelper().window.route('https://game-card.local/**', async route => {
    requests.push(JSON.parse(route.request().postData()));
    const body = openAiStream(responses[requests.length - 1]);
    await route.fulfill({ status: 200, contentType: 'text/event-stream', body });
  });

  await send('record event');
  let history = await waitForHistoryEvents(['first']);
  expect(history.retryBaseState).toEqual({});
  expect(history.messages.map(message => message.content)).toEqual([
    'record event',
    patchResponse('first')
  ]);

  await clickRetry();
  history = await waitForHistoryEvents(['retry']);

  expect(requests).toHaveLength(2);
  expect(requests[1].messages).toEqual([{ role: 'user', content: 'record event' }]);
  expect(history.retryBaseState).toEqual({});
  expect(history.messages.map(message => message.content)).toEqual([
    'record event',
    patchResponse('retry')
  ]);
});
