# MikeDown Codex Guide

## Project Identity
MikeDown is a Tauri v2 desktop Markdown editor and viewer built with React 18, TypeScript, Vite, and Rust. Treat it as a local-first macOS app with a web frontend, native filesystem/dialog integration, and release automation tied to GitHub and Homebrew.

Codex should use this checkout as the default MikeDown workspace:

```bash
codex -C /Users/michaelzuo/Engineering/AIDreamWorks/Mikedown
codex app /Users/michaelzuo/Engineering/AIDreamWorks/Mikedown
```

The repo is already trusted in `~/.codex/config.toml`; Codex does not currently expose a separate persistent `default_repo` key.

## Structure
`src/` contains the React + TypeScript frontend. Keep UI in `src/components/`, reusable logic in `src/lib/`, app state in `src/store/`, and tests in `src/test/`. Native Tauri code lives in `src-tauri/src/`, with app metadata in `src-tauri/tauri.conf.json` and capabilities/icons under `src-tauri/capabilities/` and `src-tauri/icons/`. End-to-end tests live in `e2e/`. Treat `dist/` and `src-tauri/target/` as generated output.

Key files:

- `src/store/appStore.ts`: tab state, persistence, editor state, theme, font size.
- `src/lib/markdown.ts`: marked setup, code blocks, headings, markdown rendering.
- `src/lib/exportOps.ts`: HTML/PDF export.
- `src/lib/fileOps.ts`: native file open and drag/drop file reading.
- `src/components/MarkdownRenderer.tsx`: preview DOM and post-processing.
- `src/components/SearchBar.tsx`: search and replace UI behavior.
- `src-tauri/tauri.conf.json`: app metadata and window config.

## Commands
Install dependencies with `pnpm install`.

- `pnpm dev`: run the Vite frontend.
- `pnpm tauri dev`: run the desktop app with Tauri hot reload.
- `pnpm build`: type-check and build the web bundle.
- `pnpm tauri build`: produce the packaged desktop app.
- `pnpm test`: run Vitest once.
- `pnpm test:coverage`: run Vitest with V8 coverage.
- `pnpm e2e`: run Playwright tests.

After changing Rust code, run:

```bash
cargo fmt --manifest-path src-tauri/Cargo.toml
```

## Implementation Rules
Use TypeScript with 2-space indentation, semicolons, double quotes, and functional React components. Import app modules through the `@/` alias when the target is under `src/`. Use `PascalCase` for components, `camelCase` for helpers/state, and descriptive filenames such as `exportOps.ts` and `MarkdownRenderer.tsx`.

Prefer focused store/lib tests for behavior changes. Use Playwright only for full user flows. Every behavior change should include a regression test or a clear reason it cannot.

Do not hand-edit generated output. Do not add production dependencies unless they are necessary for the requested feature and fit the existing stack.

## Known Hazard Areas
Tab-scoped async work must capture the originating tab id. Delayed work that reads `activeTabId` later can corrupt saves, autosaves, exports, or preview state after a tab switch.

Export/search correctness depends on the rendered preview DOM. Do not assume `htmlContent` is equivalent to what the user sees after Mermaid, KaTeX, local image, heading, code-copy, and other post-processing.

File operations should go through Tauri plugins rather than browser APIs. Drag/drop uses Tauri native events, not browser drag events.

Release work must keep `package.json`, `src-tauri/tauri.conf.json`, and `src-tauri/Cargo.toml` versions aligned before tagging. The Homebrew updater is driven by `.github/workflows/update-homebrew.yml` and should use an explicit tag input.

## Verification
For frontend or store/lib changes, run `pnpm test` and `pnpm build`. For Rust changes, run the relevant Cargo check or Tauri build path plus `cargo fmt --manifest-path src-tauri/Cargo.toml`. For release workflow edits, validate YAML syntax before pushing:

```bash
ruby -e 'require "yaml"; YAML.load_file(".github/workflows/release.yml"); YAML.load_file(".github/workflows/update-homebrew.yml"); puts "YAML OK"'
```

Report any skipped verification with the reason.
