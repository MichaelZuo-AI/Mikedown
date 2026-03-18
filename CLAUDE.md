# MikeDown

Tauri v2 + React 18 + TypeScript desktop Markdown editor and viewer.

## Commands

```bash
pnpm install              # install dependencies
pnpm dev                  # vite dev server (frontend only, port 1420)
pnpm build                # typecheck + vite build
pnpm test                 # run 287 tests (vitest)
pnpm tauri dev            # full Tauri dev (frontend + Rust backend)
pnpm tauri build          # production build
```

## Architecture

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Tauri v2 (Rust) with `tauri-plugin-fs` and `tauri-plugin-dialog`
- **State**: Zustand store (`src/store/appStore.ts`) with multi-tab support
- **Markdown**: `marked` v9 with custom renderer + `highlight.js` (tree-shaken, core + 17 languages)
- **Editor**: CodeMirror 6 with vim/emacs keybinding support
- **Styling**: CSS custom properties, dark/light theme via `[data-theme="light"]` on `<html>`

## Key Files

| File | Purpose |
|---|---|
| `src/App.tsx` | Root layout, Tauri drag-drop listener, keyboard shortcuts, paste handler |
| `src/store/appStore.ts` | All application state (tabs, content, UI, theme, font size) |
| `src/lib/markdown.ts` | Marked configuration with custom code block + heading renderers |
| `src/lib/fileOps.ts` | File open (native dialog) and drag-drop file reading |
| `src/lib/exportOps.ts` | HTML export and PDF export (via system print dialog) |
| `src/components/TabBar.tsx` | Multi-file tab bar (auto-hides with single tab) |
| `src/components/Editor.tsx` | CodeMirror 6 editor with vim/emacs/default keybinding modes |
| `src/index.css` | All styles — CSS variables, dark/light themes, markdown typography |
| `src-tauri/tauri.conf.json` | Window config (overlay titlebar, 1200x800, min 900x600) |
| `src-tauri/capabilities/default.json` | FS read + dialog permissions |

## Conventions

- Path alias: `@/*` → `./src/*`
- Components in `src/components/`, utilities in `src/lib/`
- CSS uses `var(--*)` design tokens, no CSS modules
- Theme toggle: `document.documentElement.setAttribute("data-theme", "light" | "")`
- File operations go through Tauri plugins, not browser APIs
- Drag-and-drop uses Tauri's native `onDragDropEvent` (not browser drag events)
- Highlight.js uses tree-shaken imports (`highlight.js/lib/core` + individual language modules)
- Tab state is managed in `appStore.ts` — each tab is a `Tab` object with its own content/metadata
