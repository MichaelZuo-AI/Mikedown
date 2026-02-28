# MD Viewer

A fast, lightweight desktop Markdown viewer built with Tauri v2 + React.

## Features

- Dark/light theme with beautiful typography (Lora, DM Sans, JetBrains Mono)
- Syntax-highlighted code blocks with one-click copy
- Auto-generated table of contents with scroll-spy
- Reading progress bar and word count
- Drag-and-drop or paste markdown files
- macOS-native overlay titlebar
- Keyboard shortcuts: `Cmd+O` open, `Cmd+\` toggle sidebar, `A+/A-` zoom

## Download

Grab the latest release from the [Releases page](https://github.com/AIDreamWorks/Markdown-Viewer/releases):

| Platform | File |
|---|---|
| macOS (Apple Silicon) | `MD Viewer_x.x.x_aarch64.dmg` |

### Install (macOS)

1. Download the `.dmg` file from [Releases](https://github.com/AIDreamWorks/Markdown-Viewer/releases)
2. Open the `.dmg` and drag **MD Viewer** to your Applications folder
3. On first launch: right-click the app → **Open** (required once for macOS Gatekeeper)

## Build from Source

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
- [Rust](https://rustup.rs/) (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`)

### Build & Run

```bash
git clone https://github.com/AIDreamWorks/Markdown-Viewer.git
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

## License

[MIT](LICENSE)
