import "@testing-library/jest-dom";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

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
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
  readTextFile: vi.fn(),
}));
