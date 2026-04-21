# MikeDown

A fast, lightweight desktop Markdown editor and viewer built with Tauri v2 + React.

## Why

AI tools like Claude, ChatGPT, and Copilot think and respond in Markdown — structured documents full of headings, code blocks, tables, and nested lists. To truly understand AI's reasoning process and make sense of its output, you need a reader that renders Markdown beautifully, not a plain-text editor. MikeDown is built for exactly that — and now lets you edit too.

## Features

- **Multi-file tabs** — open multiple documents (`Cmd+T` new, `Cmd+W` close)
- **Split-pane editor** with live preview (CodeMirror 6)
- **Vim/Emacs keybindings** — cycle modes via toolbar button
- **Search & replace** (`Cmd+F`) with match highlighting, navigation, and replace/replace all
- **KaTeX math rendering** — inline `$...$` and display `$$...$$`
- **Mermaid diagrams** — render flowcharts, sequence diagrams, and more
- **Export to HTML** — standalone file with embedded styles
- **Export to PDF** — via system print dialog
- **Recent files** — quick access from the sidebar
- **Auto-save drafts** — never lose unsaved work
- Dark/light theme with beautiful typography (Lora, DM Sans, JetBrains Mono)
- Syntax-highlighted code blocks with one-click copy
- Responsive tables with horizontal scroll for wide content
- Auto-generated table of contents with scroll-spy
- Reading progress bar and word count
- **Local images** — relative and absolute image paths rendered via Tauri asset protocol
- Live reload — automatically updates when the file changes on disk
- Drag-and-drop or paste markdown files
- macOS file association — set as default app for `.md` files
- macOS-native overlay titlebar
- Print-ready output (`Cmd+P`)
- Keyboard shortcuts: `Cmd+O` open, `Cmd+E` edit, `Cmd+S` save, `Cmd+F` search, `Cmd+T` new tab, `Cmd+W` close tab, `Cmd+\` toggle sidebar, `Cmd+=`/`Cmd+-` zoom, `Cmd+0` reset zoom, trackpad pinch-to-zoom

## Install

### Homebrew (recommended)

```bash
brew tap MichaelZuo-AI/tap
brew install --cask mikedown
```

### Manual Download

Grab the `.dmg` from the [Releases page](https://github.com/MichaelZuo-AI/Mikedown/releases):

| Platform | File |
|---|---|
| macOS (Apple Silicon) | `MikeDown_x.x.x_aarch64.dmg` |

1. Open the `.dmg` and drag **MikeDown** to your Applications folder
2. On first launch: right-click the app → **Open** (required once for macOS Gatekeeper)

## Build from Source

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
- [Rust](https://rustup.rs/) (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)

### Build & Run

```bash
git clone https://github.com/MichaelZuo-AI/Mikedown.git
cd Mikedown
pnpm install
pnpm tauri dev        # development (hot reload)
pnpm tauri build      # production binary → src-tauri/target/release/bundle/
```

The first build takes a few minutes to compile Rust dependencies. Subsequent builds are fast.

## Tech Stack

| Layer | Tech |
|---|---|
| Window & Native APIs | [Tauri v2](https://v2.tauri.app/) (Rust) |
| Frontend | React 18 + TypeScript + Vite |
| Markdown | [marked](https://marked.js.org/) + [highlight.js](https://highlightjs.org/) |
| Math | [KaTeX](https://katex.org/) |
| Diagrams | [Mermaid](https://mermaid.js.org/) |
| Editor | [CodeMirror 6](https://codemirror.net/) |
| State | [Zustand](https://zustand-demo.pmnd.rs/) |

## Changelog

### v0.15.0

- Fix cross-tab autosave, draft, and preview parsing races by scoping delayed work to the edited tab
- Fix save/save-as not updating the real tab record in multi-tab sessions
- Fix standalone HTML export to preserve rendered preview output and inline local images
- Fix preview search from matching generated chrome like code-copy buttons instead of markdown content

### v0.13.0

- Search & replace — collapsible replace row with single replace and replace all
- Zoom via keyboard — `Cmd+=`/`Cmd+-` to zoom in/out, `Cmd+0` to reset
- Trackpad pinch-to-zoom support on macOS
- Fix zoom not visually working — switched from `font-size: rem` to CSS `zoom` for uniform scaling
- Fix Homebrew CI race condition — cask update now triggers after release build completes

### v0.12.0

- Fix code blocks not scrolling with page content
- Fix theme always resetting to dark mode on new window

### v0.11.1

- Maintenance release

### v0.11.0

- Collapsible sidebar with toggle button for full-screen reading mode

### v0.10.0

- Table paste conversion — paste HTML tables or TSV/CSV data, auto-converts to Markdown tables in editor
- Interactive checkboxes — click task list checkboxes in preview to toggle `[x]`/`[ ]` in source
- Auto-save to file — dirty files with known paths auto-saved to disk after 3s of inactivity
- Session tab persistence — all open tabs restored across app restarts
- GitHub-style callout blocks — `> [!NOTE]`, `> [!WARNING]`, `> [!TIP]` etc. rendered with colored styling
- Clickable URLs in editor — Cmd/Ctrl+Click to open links, with underline decoration and hover tooltip
- Synchronized editor-preview scrolling — editor and preview scroll together in split mode
- Image paste from clipboard — paste images in editor, saved to `assets/` folder with markdown link inserted

### v0.9.1

- Fix file watcher on macOS — external edits now reliably detected (watch parent directory instead of file inode)

### v0.9.0

- Fix local image rendering — enable Tauri asset protocol so relative/absolute image paths load correctly
- Normalize `../` segments in relative image paths

### v0.8.0

- Homebrew cask distribution (`brew install --cask mikedown`)
- CI: auto-update Homebrew tap on release publish
- CI: macOS Apple Silicon only (dropped Windows/Linux builds)

### v0.7.0

- Multi-file tabs (`Cmd+T` new, `Cmd+W` close) with auto-hiding tab bar
- Vim/Emacs keybinding modes for the editor
- PDF export via system print dialog
- Tree-shaken highlight.js (~40% smaller main bundle)
- Responsive table layout — wide tables scroll horizontally
- CI: frontend tests, Rust tests, cross-platform builds (macOS/Windows/Linux)

### v0.6.0

- Document search (`Cmd+F`) with match highlighting and navigation
- KaTeX math rendering — inline and display math
- Export to standalone HTML with embedded styles
- Recent files list in sidebar
- Auto-save drafts to localStorage (24h expiry)
- Error toast notifications for save/export failures
- Print stylesheet for clean `Cmd+P` output
- Empty mermaid block placeholder
- Heading ID fix for special-character-only headings
- Smarter mermaid loading — skip empty blocks

### v0.5.0

- Rename to **MikeDown**
- Split-pane markdown editor with live preview (CodeMirror 6)
- Save support (`Cmd+S`) with unsaved-changes indicator
- Toggle edit mode with `Cmd+E` or toolbar button

### v0.4.0

- Mermaid diagram rendering

### v0.3.1

- Live reload — file changes on disk are automatically detected and re-rendered
- CLI file opening — pass file paths as arguments when launching from the terminal

### v0.3.0

- macOS file association — register as handler for `.md` and `.markdown` files, supports both cold start and warm open
- Widened file-system read scope for files opened from any location
- Extension filtering on Rust side for defense in depth
- Mutex poison recovery and race condition fix for robustness
- 27 new tests (15 Rust + 12 frontend) for file-open code paths

### v0.2.0

- Initial release
- Dark/light theme with custom typography
- Syntax-highlighted code blocks with copy button
- Auto-generated table of contents with scroll-spy
- Reading progress bar and word count
- Drag-and-drop, paste, and native file dialog
- macOS-native overlay titlebar
- Keyboard shortcuts

## License

[MIT](LICENSE)
