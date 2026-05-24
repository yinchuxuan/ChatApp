# Plan: Comprehensive Game Card E2E Tests

## Context

The game card system is a JSON-driven rule engine that transforms messages before/after LLM API calls. Existing e2e tests (`app.e2e.game-card-*.test.js`) cover basic scenarios but miss many edge cases, protocol-specific behaviors, and multi-turn interactions. The user wants comprehensive e2e tests using OpenAI/Anthropic protocols (via mocked real API endpoints, following the existing e2e pattern) to verify game card mechanisms.

## New Test File

**`test/e2e/app.e2e.game-card-comprehensive.test.js`** — Playwright e2e test suite with Playwright's Electron app.

### Test Groups and Scenarios

#### 1. Protocol Adapter & Message Transformation

- **OpenAI system messages stay in messages array** — game card inserts system prompt, verify it's in `messages[]` of the API request
- **Anthropic system messages extracted to top-level `system`** — same card, verify `request.system` is populated and `request.messages` has no system role
- **Multiple system messages joined with `\n\n` for Anthropic** — insert two system prompts via separate rules, verify `system: "first\n\nsecond"`
- **`debug_only` messages excluded from both protocols** — insert a debug trace message, verify it's absent from the API request

#### 2. Pre-send Pipeline

- **`when.length` triggers only on first message** — card with `when: { phase: "pre_send", length: 1 }`, send two messages, verify rule only applies to first
- **`when.length` comparison operators** (`lte`, `gte`) — verify conditional execution
- **`when.any` content matching** — rule fires only when a message contains specific text
- **`when.all` requires all messages to match** — verify it doesn't fire when one message doesn't match
- **`when.last` predicate matching** — rule fires based on last message role
- **`pre_send` rules compose: insert + replace in sequence** — insert system, then replace user content, verify final order

#### 3. After-response Pipeline

- **`after_response` replaces assistant content** — clean markdown code fences from LLM response
- **`after_response` inserts hint with TTL** — insert a temporary system hint, verify TTL is set and decays
- **`after_response` `when.last` conditional** — only transform when last message is assistant
- **Multi-turn TTL decay across two sends** — send message 1 (creates ttl=2 hint), send message 2 (hint ttl decays to 1), send message 3 (hint removed)

#### 4. Content Descriptor

- **`raw_string` prefix** — prepend label to user messages
- **`regex_replace` chain** — multiple regex replacements on assistant response
- **`regex_extract` capture group** — extract JSON from code block
- **`+` concatenation of raw_string + original_content + file_content** — verify full composition

#### 5. Exec Runtime

- **State mutation with dice roll** — exec uses `utils.roll('1d6')` to modify state
- **`utils.clamp` prevents negative HP** — verify clamping behavior
- **Exec inserts/removes messages** — push new system message, remove matching messages
- **Exec error produces trace error** — invalid JS syntax produces captured error
- **Exec blocks `fetch` in browser** — security constraint test
- **Exec blocks `window/document` in browser** — security constraint test

#### 6. File Content & Path Safety

- **Valid `file_content` resolved correctly** — relative path inside card directory
- **`../` traversal rejected** — path escape attempt produces error in UI, no API call sent
- **Absolute path rejected** — `/etc/passwd` attempt blocked

#### 7. Visibility & History

- **`llm_only` messages saved to history but hidden in UI** — verify history contains them, DOM doesn't show them
- **`debug_only` messages excluded from history** — verify they're not persisted
- **Game card control shows active card name** — verify header displays card name

#### 8. Multi-turn Round Trip (Full Integration)

- **Two-turn conversation with active game card** — send "start quest", get response, send "continue", verify:
  - First request has correct system prompt and transformed user message
  - Second request includes history messages correctly
  - TTL messages decay and expire across turns
  - Anthropic vs OpenAI request bodies differ correctly
- **Game card deactivated mid-session** — activate card, send message, deactivate, send message, verify second message has no transformations

## Approach

- Follow existing e2e patterns: `ElectronAppHelper`, `revealChatInput`, route interception for mocked API
- Each test launches a fresh Electron app instance (`beforeEach`/`afterEach`)
- Mock API responses via `appHelper.window.route()` with SSE-formatted responses
- Assertions check both the intercepted API requests (`requests[]`) and UI state (`locator()`)
- Use `test.skip()` for tests requiring real API keys (reference `anthropic-config.test.js` pattern)

## Verification

Run: `npx playwright test test/e2e/app.e2e.game-card-comprehensive.test.js`

All tests should pass with mocked API endpoints.
