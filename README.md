# MikeDown

A fast, lightweight desktop Markdown editor and viewer built with Tauri v2 + React.

## Why

AI tools like Claude, ChatGPT, and Copilot think and respond in Markdown — structured documents full of headings, code blocks, tables, and nested lists. To truly understand AI's reasoning process and make sense of its output, you need a reader that renders Markdown beautifully, not a plain-text editor. MikeDown is built for exactly that — and now lets you edit too.

## Features

- **Split-pane editor** with live preview (CodeMirror 6)
- **Document search** (`Cmd+F`) with match highlighting and navigation
- **KaTeX math rendering** — inline `$...$` and display `$$...$$`
- **Mermaid diagrams** — render flowcharts, sequence diagrams, and more
- **Export to HTML** — standalone file with embedded styles
- **Recent files** — quick access from the sidebar
- **Auto-save drafts** — never lose unsaved work
- Dark/light theme with beautiful typography (Lora, DM Sans, JetBrains Mono)
- Syntax-highlighted code blocks with one-click copy
- Auto-generated table of contents with scroll-spy
- Reading progress bar and word count
- Live reload — automatically updates when the file changes on disk
- Drag-and-drop or paste markdown files
- macOS file association — set as default app for `.md` files
- macOS-native overlay titlebar
- Print-ready output (`Cmd+P`)
- Keyboard shortcuts: `Cmd+O` open, `Cmd+E` edit, `Cmd+S` save, `Cmd+F` search, `Cmd+\` toggle sidebar, `A+/A-` zoom

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
