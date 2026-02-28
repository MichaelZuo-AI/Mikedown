/**
 * Tests for src/App.tsx
 *
 * Strategy: Render the App component inside a jsdom environment. Tauri APIs
 * are already mocked globally in setup.ts. Child components (Sidebar, Toolbar,
 * MarkdownRenderer, DropZone, ProgressBar) are rendered for real — they are
 * simple enough that we avoid an over-mocked test suite. We focus on:
 *
 *   1. Structural rendering (children present, layout classes)
 *   2. Theme effect (data-theme attribute on <html>)
 *   3. Keyboard shortcut handling
 *   4. Paste handler
 *   5. Cleanup on unmount
 */

import { describe, it, expect, beforeEach, vi, afterEach, type Mock } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useAppStore } from "@/store/appStore";
import App from "@/App";

// ---- mock helpers -----------------------------------------------------------

const INITIAL_STATE = {
  markdownContent: "",
  htmlContent: "",
  fileName: "No file opened",
  filePath: "",
  wordCount: 0,
  readingTime: 0,
  sidebarCollapsed: false,
  isDragOver: false,
  isDropZoneVisible: true,
  theme: "dark",
  fontSize: 100,
} as const;

function resetStore() {
  useAppStore.setState(INITIAL_STATE);
}

// Helper: simulate keyboard event on window
function pressKey(key: string, modifiers: { metaKey?: boolean; ctrlKey?: boolean } = {}) {
  fireEvent.keyDown(window, { key, ...modifiers });
}

// ---------------------------------------------------------------------------

describe("App — rendering", () => {
  beforeEach(() => {
    resetStore();
  });

  it("renders without crashing", () => {
    render(<App />);
    // If rendering throws, the test will fail automatically
  });

  it("renders the toolbar with the default file name", () => {
    render(<App />);
    expect(screen.getByText("No file opened")).toBeInTheDocument();
  });

  it("renders the drop zone when isDropZoneVisible is true", () => {
    render(<App />);
    expect(screen.getByText("Drop a Markdown file here")).toBeInTheDocument();
  });

  it("renders the sidebar header logo text", () => {
    render(<App />);
    expect(screen.getByText("MD Viewer")).toBeInTheDocument();
  });

  it("renders the Open File button in the sidebar", () => {
    render(<App />);
    // Sidebar has an "Open File" button
    const openBtns = screen.getAllByText(/Open File/i);
    expect(openBtns.length).toBeGreaterThanOrEqual(1);
  });

  it("renders the zoom-in button", () => {
    render(<App />);
    expect(screen.getByTitle("Zoom in")).toBeInTheDocument();
  });

  it("renders the zoom-out button", () => {
    render(<App />);
    expect(screen.getByTitle("Zoom out")).toBeInTheDocument();
  });

  it("renders the theme toggle button", () => {
    render(<App />);
    expect(screen.getByTitle("Toggle theme")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------

describe("App — theme effect", () => {
  beforeEach(() => {
    resetStore();
    // Clear any previous data-theme attribute
    document.documentElement.removeAttribute("data-theme");
  });

  afterEach(() => {
    document.documentElement.removeAttribute("data-theme");
  });

  it("sets data-theme to empty string when theme is dark", () => {
    useAppStore.setState({ theme: "dark" });
    render(<App />);
    expect(document.documentElement.getAttribute("data-theme")).toBe("");
  });

  it("sets data-theme to 'light' when theme is light", () => {
    useAppStore.setState({ theme: "light" });
    render(<App />);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });

  it("updates data-theme when theme changes after render", async () => {
    useAppStore.setState({ theme: "dark" });
    render(<App />);
    expect(document.documentElement.getAttribute("data-theme")).toBe("");

    act(() => {
      useAppStore.getState().toggleTheme();
    });
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
  });
});

// ---------------------------------------------------------------------------

describe("App — keyboard shortcuts", () => {
  beforeEach(() => {
    resetStore();
  });

  it("Cmd+\\ toggles the sidebar (Mac)", () => {
    render(<App />);
    expect(useAppStore.getState().sidebarCollapsed).toBe(false);

    pressKey("\\", { metaKey: true });
    expect(useAppStore.getState().sidebarCollapsed).toBe(true);
  });

  it("Ctrl+\\ toggles the sidebar (non-Mac)", () => {
    render(<App />);
    expect(useAppStore.getState().sidebarCollapsed).toBe(false);

    pressKey("\\", { ctrlKey: true });
    expect(useAppStore.getState().sidebarCollapsed).toBe(true);
  });

  it("pressing \\ without modifier does NOT toggle sidebar", () => {
    render(<App />);
    pressKey("\\");
    expect(useAppStore.getState().sidebarCollapsed).toBe(false);
  });

  it("Cmd+\\ toggles sidebar back when pressed twice", () => {
    render(<App />);
    pressKey("\\", { metaKey: true });
    pressKey("\\", { metaKey: true });
    expect(useAppStore.getState().sidebarCollapsed).toBe(false);
  });

  it("Cmd+O calls openMarkdownFile (mocked — no crash)", () => {
    // openMarkdownFile is imported from fileOps and calls Tauri open().
    // Tauri open() is mocked to return null in setup.ts.
    // We simply verify the keyboard handler runs without throwing.
    render(<App />);
    expect(() => pressKey("o", { metaKey: true })).not.toThrow();
  });

  it("Ctrl+O calls openMarkdownFile without crashing", () => {
    render(<App />);
    expect(() => pressKey("o", { ctrlKey: true })).not.toThrow();
  });

  it("removes keydown listener on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<App />);
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
    removeEventListenerSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------

describe("App — paste handler", () => {
  // Each paste test must explicitly unmount to trigger useEffect cleanup and
  // remove the window paste listener — otherwise the listener leaks into
  // the next test and fires again when we dispatch a new paste event.
  beforeEach(() => {
    resetStore();
  });

  it("loads markdown from clipboard when content starts with #", () => {
    const { unmount } = render(<App />);
    const md = "# Pasted heading\n\nSome paragraph.";

    fireEvent.paste(window, {
      clipboardData: { getData: () => md },
    });

    expect(useAppStore.getState().markdownContent).toBe(md);
    expect(useAppStore.getState().fileName).toBe("Pasted");
    unmount();
  });

  it("loads markdown when pasted content is plain text (no # required)", () => {
    const { unmount } = render(<App />);
    fireEvent.paste(window, {
      clipboardData: { getData: () => "just plain text" },
    });
    // Any non-empty text should be accepted as markdown
    expect(useAppStore.getState().markdownContent).toBe("just plain text");
    expect(useAppStore.getState().fileName).toBe("Pasted");
    unmount();
  });

  it("ignores paste when clipboard text is empty", () => {
    const { unmount } = render(<App />);
    fireEvent.paste(window, {
      clipboardData: { getData: () => "" },
    });
    expect(useAppStore.getState().markdownContent).toBe("");
    unmount();
  });

  it("loads whitespace-only text as markdown (trim check for emptiness)", () => {
    // The guard is text.trim().length > 0 — whitespace-only is ignored, but
    // indented markdown is not whitespace-only so it is loaded.
    const { unmount } = render(<App />);
    const md = "  # Indented heading";

    fireEvent.paste(window, {
      clipboardData: { getData: () => md },
    });

    expect(useAppStore.getState().markdownContent).toBe(md);
    unmount();
  });

  it("removes paste listener on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<App />);
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith("paste", expect.any(Function));
    removeEventListenerSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------

describe("App — Tauri drag-drop integration", () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  it("registers a drag-drop listener via getCurrentWindow().onDragDropEvent", async () => {
    const mockOnDragDrop = vi.fn(() => Promise.resolve(vi.fn()));
    (getCurrentWindow as Mock).mockReturnValue({
      onDragDropEvent: mockOnDragDrop,
    });

    render(<App />);

    // Give the useEffect Promise time to resolve
    await act(async () => {});

    expect(mockOnDragDrop).toHaveBeenCalledOnce();
  });

  it("calls unlisten returned by onDragDropEvent when unmounted", async () => {
    const mockUnlisten = vi.fn();
    const mockOnDragDrop = vi.fn(() => Promise.resolve(mockUnlisten));
    (getCurrentWindow as Mock).mockReturnValue({
      onDragDropEvent: mockOnDragDrop,
    });

    const { unmount } = render(<App />);
    await act(async () => {}); // let Promise resolve

    unmount();
    expect(mockUnlisten).toHaveBeenCalledOnce();
  });

  it("sets isDragOver to true when drag 'enter' event fires", async () => {
    let capturedCallback: ((e: { payload: { type: string; paths: string[] } }) => void) | undefined;

    const mockOnDragDrop = vi.fn((cb: typeof capturedCallback) => {
      capturedCallback = cb;
      return Promise.resolve(vi.fn());
    });
    (getCurrentWindow as Mock).mockReturnValue({
      onDragDropEvent: mockOnDragDrop,
    });

    render(<App />);
    await act(async () => {});

    act(() => {
      capturedCallback?.({ payload: { type: "enter", paths: [] } });
    });

    expect(useAppStore.getState().isDragOver).toBe(true);
  });

  it("sets isDragOver to true when drag 'over' event fires", async () => {
    let capturedCallback: ((e: { payload: { type: string; paths: string[] } }) => void) | undefined;

    const mockOnDragDrop = vi.fn((cb: typeof capturedCallback) => {
      capturedCallback = cb;
      return Promise.resolve(vi.fn());
    });
    (getCurrentWindow as Mock).mockReturnValue({
      onDragDropEvent: mockOnDragDrop,
    });

    render(<App />);
    await act(async () => {});

    act(() => {
      capturedCallback?.({ payload: { type: "over", paths: [] } });
    });

    expect(useAppStore.getState().isDragOver).toBe(true);
  });

  it("sets isDragOver to false when drag 'leave' event fires", async () => {
    let capturedCallback: ((e: { payload: { type: string; paths: string[] } }) => void) | undefined;

    useAppStore.setState({ isDragOver: true });

    const mockOnDragDrop = vi.fn((cb: typeof capturedCallback) => {
      capturedCallback = cb;
      return Promise.resolve(vi.fn());
    });
    (getCurrentWindow as Mock).mockReturnValue({
      onDragDropEvent: mockOnDragDrop,
    });

    render(<App />);
    await act(async () => {});

    act(() => {
      capturedCallback?.({ payload: { type: "leave", paths: [] } });
    });

    expect(useAppStore.getState().isDragOver).toBe(false);
  });
});
