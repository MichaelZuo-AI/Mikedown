# MD Viewer

A fast, lightweight desktop Markdown viewer built with Tauri v2 + React.

## Why

AI tools like Claude, ChatGPT, and Copilot think and respond in Markdown — structured documents full of headings, code blocks, tables, and nested lists. To truly understand AI's reasoning process and make sense of its output, you need a reader that renders Markdown beautifully, not a plain-text editor. MD Viewer is built for exactly that.

## Features

- Dark/light theme with beautiful typography (Lora, DM Sans, JetBrains Mono)
- Syntax-highlighted code blocks with one-click copy
- Auto-generated table of contents with scroll-spy
- Reading progress bar and word count
- Live reload — automatically updates when the file changes on disk
- Drag-and-drop or paste markdown files
- macOS file association — set as default app for `.md` files
- macOS-native overlay titlebar
- Keyboard shortcuts: `Cmd+O` open, `Cmd+\` toggle sidebar, `A+/A-` zoom

## Install

### Homebrew (recommended)

```bash
brew tap MichaelZuo-AI/tap
brew install --cask md-viewer
```

### Manual Download

Grab the `.dmg` from the [Releases page](https://github.com/MichaelZuo-AI/Markdown-Viewer/releases):

| Platform | File |
|---|---|
| macOS (Apple Silicon) | `MD Viewer_x.x.x_aarch64.dmg` |

1. Open the `.dmg` and drag **MD Viewer** to your Applications folder
2. On first launch: right-click the app → **Open** (required once for macOS Gatekeeper)

## Build from Source

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
- [Rust](https://rustup.rs/) (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)

### Build & Run

```bash
git clone https://github.com/MichaelZuo-AI/Markdown-Viewer.git
cd Markdown-Viewer
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
| State | [Zustand](https://zustand-demo.pmnd.rs/) |

## Changelog

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
