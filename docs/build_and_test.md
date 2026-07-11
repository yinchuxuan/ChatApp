# Build, Test & Run

Vite requires Node.js `^20.19.0` or `>=22.12.0` for local build and development commands.

## Scripts

| Command | Description |
|---|---|
| `npm run build` | Build the React renderer to `dist/renderer/` with Vite |
| `npm run dev` | Start the Vite dev server and launch Electron against it |
| `npm run lint` | Run ESLint on all `.js`/`.jsx` files |
| `npm run lint:fix` | Run ESLint with auto-fix |

## Testing

The test suite has three layers, run in order by `npm test`:

### Unit Tests (`test/**/*.test.js`, excluding `*.integration.test.js`)
- **Framework**: Jest + jsdom + Testing Library
- **Config**: `jest.config.js` — mocks `electron` and `fs`, collects coverage on `src/`
- **Thresholds**: 15% branches, 20% functions/lines/statements
- **Run**: `npx jest`

### Integration Tests (`test/**/*.integration.test.js`)
- **Framework**: Jest with real filesystem (no `fs` mock)
- **Config**: `jest.integration.config.js` — excludes e2e and unit test dirs
- **Run**: `npm run test:integration`

Unit and integration tests are grouped by ownership:

- `test/chat/`: chat runtime, generation, retry and rendering.
- `test/game-card/`: shared core, renderer runtime and game card integration.
- `test/storage/`: JSON storage, migrations and IPC persistence.
- `test/platform/`: platform adapters and local resource protocol.
- `test/components/`: platform UI components outside the chat runtime.
- `test/ipc/`: retained legacy handler tests that are not part of the active suites.

### E2E Tests (`test/e2e/**`)
- **Framework**: Playwright for Electron
- **Config**: `playwright.config.js` — 180s timeout, max 3 failures, parallel workers
- **Scope**: deterministic Electron startup, UI, IPC, and mocked-API user flows
- **Run**: `npm run test:e2e`

### Real API E2E Tests (`test/e2e-real-api/**`)
- **Framework**: Playwright for Electron with real OpenAI/Anthropic-compatible endpoints
- **Config**: `playwright.real-api.config.js` — serial workers, one retry, longer timeout
- **Env**: Loads `.env` when present; uses `E2E_OPENAI_*` and `E2E_ANTHROPIC_*`
- **Run**: `npm run test:e2e-real-api`

## Pre-test Hook

`npm test` automatically runs `npm run build` first via `pretest`, so Electron E2E tests use the current Vite production output.

## Renderer Build

- `src/main.jsx` is the single renderer entry.
- `src/styles/renderer.css` is the single platform CSS entry and owns platform style order.
- `src/index.html` contains one module script; Vite resolves the complete JavaScript and CSS dependency graph.
- Development uses Vite React refresh through `scripts/dev.js`.
- Production and Electron E2E load `dist/renderer/index.html`.
- The preload boundary remains available as `window.electronAPI`; platform modules are imported with standard ESM syntax.
- Game card `display`, `visual` and `ui` styles are loaded at runtime and scoped independently from platform CSS.

## Git Hooks

`husky` + `lint-staged` runs `eslint --fix` on all staged `.js`/`.jsx` files before each commit.
