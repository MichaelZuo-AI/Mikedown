import "@testing-library/jest-dom";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Polyfill localStorage for jsdom workers that may not have the full Storage API
if (typeof globalThis.localStorage === "undefined" || typeof globalThis.localStorage?.getItem !== "function") {
  const store: Record<string, string> = {};
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = String(value); },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { for (const key of Object.keys(store)) delete store[key]; },
      get length() { return Object.keys(store).length; },
      key: (index: number) => Object.keys(store)[index] ?? null,
    },
    writable: true,
    configurable: true,
  });
}

// Polyfill requestAnimationFrame / cancelAnimationFrame for jsdom
if (typeof globalThis.requestAnimationFrame === "undefined") {
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) => setTimeout(() => cb(Date.now()), 0) as unknown as number;
  globalThis.cancelAnimationFrame = (id: number) => clearTimeout(id);
}

// Clean up the DOM after every test
afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// Mock Tauri APIs globally — the Tauri runtime is not available in jsdom.
// Individual test files can override these with vi.mocked() as needed.
// ---------------------------------------------------------------------------

vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: vi.fn(() => ({
    onDragDropEvent: vi.fn(() => Promise.resolve(vi.fn())),
  })),
}));

vi.mock("@tauri-apps/plugin-dialog", () => ({
  open: vi.fn(),
  save: vi.fn(),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  readFile: vi.fn(),
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(() => Promise.resolve()),
  watch: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(() => Promise.resolve([])),
  convertFileSrc: vi.fn((path: string) => `http://asset.localhost/${path}`),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(() => Promise.resolve(vi.fn())),
}));

// ---------------------------------------------------------------------------
// Mock mermaid — the real library requires a browser canvas context and web
// workers that are unavailable in jsdom.  Tests that import MarkdownRenderer
// can inspect these mocks directly via vi.mocked(mermaid).
// ---------------------------------------------------------------------------

vi.mock("mermaid", () => ({
  default: {
    initialize: vi.fn(),
    run: vi.fn(() => Promise.resolve()),
  },
}));

// ---------------------------------------------------------------------------
// Mock katex — the real library works fine in jsdom but we mock for speed
// and to verify our integration logic.
// ---------------------------------------------------------------------------

vi.mock("katex", () => ({
  default: {
    renderToString: vi.fn((tex: string, opts?: { displayMode?: boolean }) =>
      opts?.displayMode
        ? `<span class="katex-display">${tex}</span>`
        : `<span class="katex">${tex}</span>`
    ),
  },
}));
