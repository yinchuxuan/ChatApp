# Build, Test & Run

Vite requires Node.js `^20.19.0` or `>=22.12.0` for local build and development commands.

## Scripts

| Command | Description |
|---|---|
| `npm run build` | Build the React renderer to `dist/renderer/` with Vite |
| `npm run dev` | Start the Vite dev server and launch Electron against it |
| `npm run renderer:dev` | Start only the Vite renderer on fixed port `1420` |
| `npm run tauri:dev` | Start the Vite renderer and Tauri desktop debug app |
| `npm run tauri:build` | Build the renderer and native Tauri desktop bundle |
| `npm run tauri:e2e:build` | Build an isolated debug Tauri binary with test-only WebDriver plugins |
| `npm run test:tauri-e2e` | Run WebdriverIO against an existing Tauri E2E binary |
| `npm run test:tauri` | Build and run the complete Tauri desktop E2E suite |
| `cargo test --manifest-path src-tauri/Cargo.toml` | Run Tauri Rust backend tests |
| `npm run lint` | Run ESLint on all `.js`/`.jsx` files |
| `npm run lint:fix` | Run ESLint with auto-fix |

Tauri commands require the stable Rust toolchain and the platform prerequisites from the Tauri 2 documentation. The Rust backend currently provides configuration, chat history, session storage, game card repository and directory import, plus controlled image, audio and user background resource protocols.

## Testing

The test suite has three layers, run in order by `npm test`:

Tauri Rust tests run separately with `cargo test --manifest-path src-tauri/Cargo.toml`. They cover atomic JSON replacement, configuration persistence, session isolation, retry state, concurrent saves, Electron user data migration and rollback, game card imports, schema parity, path safety, session-preserving card replacement, resource authorization, MIME and audio Range responses, plus model request validation, streaming bytes and cancellation.

### Unit Tests (`test/**/*.test.js`, excluding `*.integration.test.js`)
- **Framework**: Jest + jsdom + Testing Library
- **Config**: `jest.config.js` — mocks `electron` and `fs`, collects coverage on `src/`
- **Thresholds**: 70% branches, 80% functions, 85% lines, 82% statements
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
- `test/ipc/`: active handler unit tests. `fileHandlers.test.js` is explicitly archived because PDF/DOCX/image document IPC was removed from the product.

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

### Tauri Desktop E2E (`test/tauri-e2e/**`)
- **Framework**: WebdriverIO with the embedded Tauri WebDriver provider.
- **Isolation**: the `e2e` Cargo feature enables test plugins, a temporary app data directory and a fixed fixture import directory. Production builds contain none of these permissions.
- **Scope**: settings, sessions, retry, stream abort, real directory import, dynamic React UI, controlled image/audio URLs and process restart persistence.
- **Network**: a local streaming endpoint drives the real Rust HTTP Channel and cancellation commands.
- **Run**: `npm run test:tauri`.

## Pre-test Hook

`npm test` automatically runs `npm run build` first via `pretest`, so Electron E2E tests use the current Vite production output.

## Renderer Build

- `src/main.jsx` is the single renderer entry.
- `src/styles/renderer.css` is the single platform CSS entry and owns platform style order.
- `src/index.html` contains one module script; Vite resolves the complete JavaScript and CSS dependency graph.
- Development uses Vite React refresh through `scripts/dev.js`.
- Vite development routes model API requests through a local same-origin streaming proxy so providers without browser CORS headers remain usable; production Electron continues to request providers directly.
- Tauri development uses the same Vite config at `http://localhost:1420`; the fixed port prevents the native shell from loading a different server.
- Tauri dev/build commands pass `--mode tauri`; other Vite modes compile the Electron adapter as the fixed desktop target.
- Tauri model requests use Rust `reqwest` and Channel; Electron keeps browser `fetch`, while Electron development can use the Vite same-origin proxy.
- Roboto and Roboto Mono font assets are bundled from `@fontsource`; renderer startup does not require Google Fonts.
- Production and Electron E2E load `dist/renderer/index.html`.
- Tauri production bundles the same `dist/renderer/` output through `src-tauri/tauri.conf.json`.
- The preload boundary remains available as `window.electronAPI`; platform modules are imported with standard ESM syntax.
- Game card `display`, `visual` and `ui` styles are loaded at runtime and scoped independently from platform CSS.
- ESLint 显式扫描 `.js` 和 `.jsx`，并要求所有识别出的 React 组件声明 PropTypes。

## Desktop Bundles and CI
- `.github/workflows/tauri-ci.yml` runs the JavaScript/Electron suite and a macOS, Windows and Linux Tauri matrix.
- Every desktop target runs Rust formatting, clippy, tests and Tauri E2E before creating a native installer artifact.
- Platform configs produce macOS app/DMG, Windows NSIS and Linux deb/AppImage. AppImage includes GStreamer media support for game card BGM.
- `.github/workflows/tauri-release.yml` creates a draft release for `app-v*` tags and builds macOS arm64/x64 plus Windows/Linux artifacts.
- macOS release jobs require `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `KEYCHAIN_PASSWORD`, `APPLE_ID`, `APPLE_PASSWORD` and `APPLE_TEAM_ID`.
- Windows release jobs require `WINDOWS_CERTIFICATE` and `WINDOWS_CERTIFICATE_PASSWORD`; CI artifacts remain unsigned.

## Git Hooks

`husky` + `lint-staged` runs `eslint --fix` on all staged `.js`/`.jsx` files before each commit.
