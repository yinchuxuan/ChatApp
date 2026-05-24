# Build, Test & Run

## Scripts

| Command | Description |
|---|---|
| `npm run build` | Pre-compile JSX/JS in `src/` to plain JS in `dist/` via Babel |
| `npm run dev` | Launch Electron app in development mode (`electron .`) |
| `npm run lint` | Run ESLint on all `.js`/`.jsx` files |
| `npm run lint:fix` | Run ESLint with auto-fix |

## Testing

The test suite has three layers, run in order by `npm test`:

### Unit Tests (`test/**/*.test.js`)
- **Framework**: Jest + jsdom + Testing Library
- **Config**: `jest.config.js` — mocks `electron` and `fs`, collects coverage on `src/`
- **Thresholds**: 15% branches, 20% functions/lines/statements
- **Run**: `npx jest`

### Integration Tests (`test/integration/**/*.test.js`, `test/ipc/*.integration.test.js`)
- **Framework**: Jest with real filesystem (no `fs` mock)
- **Config**: `jest.integration.config.js` — excludes e2e and unit test dirs
- **Run**: `npm run test:integration`

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

`npm test` automatically runs `npm run build` first via `pretest` — the JSX must be compiled before any tests execute.

## Git Hooks

`husky` + `lint-staged` runs `eslint --fix` on all staged `.js`/`.jsx` files before each commit.
