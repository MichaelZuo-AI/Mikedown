/**
 * Tests for src/App.tsx
 */

import { describe, it, expect, beforeEach, vi, afterEach, type Mock } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useAppStore } from "@/store/appStore";
import * as fileOps from "@/lib/fileOps";
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
  theme: "dark" as const,
  fontSize: 100,
  editMode: false,
  dirty: false,
  searchOpen: false,
  toastMessage: "",
  toastVisible: false,
  recentFiles: [],
};

function resetStore() {
  useAppStore.setState(INITIAL_STATE);
  try { localStorage.clear(); } catch { /* jsdom may not have localStorage */ }
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
    expect(screen.getByText("MikeDown")).toBeInTheDocument();
  });

  it("renders the Open File button in the sidebar", () => {
    render(<App />);
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

  it("Cmd+F toggles search", () => {
    render(<App />);
    expect(useAppStore.getState().searchOpen).toBe(false);
    pressKey("f", { metaKey: true });
    expect(useAppStore.getState().searchOpen).toBe(true);
  });

  it("Ctrl+F toggles search", () => {
    render(<App />);
    pressKey("f", { ctrlKey: true });
    expect(useAppStore.getState().searchOpen).toBe(true);
  });
});

// ---------------------------------------------------------------------------

describe("App — paste handler", () => {
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
    await act(async () => {});

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

// ---------------------------------------------------------------------------

describe("App — cold start: invoke('get_opened_files')", () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  it("calls invoke with 'get_opened_files' on mount", async () => {
    (invoke as Mock).mockResolvedValueOnce([]);

    render(<App />);
    await act(async () => {});

    expect(invoke).toHaveBeenCalledWith("get_opened_files");
  });

  it("calls invoke exactly once per mount", async () => {
    (invoke as Mock).mockResolvedValueOnce([]);

    render(<App />);
    await act(async () => {});

    const invokeCalls = (invoke as Mock).mock.calls.filter(
      (args: unknown[]) => args[0] === "get_opened_files",
    );
    expect(invokeCalls).toHaveLength(1);
  });

  it("calls readDroppedFile with the first path when invoke returns a non-empty list", async () => {
    const paths = ["/Users/mike/notes.md", "/Users/mike/other.md"];
    (invoke as Mock).mockResolvedValueOnce(paths);

    const spy = vi.spyOn(fileOps, "readDroppedFile").mockResolvedValueOnce(undefined);

    render(<App />);
    await act(async () => {});

    expect(spy).toHaveBeenCalledOnce();
    expect(spy).toHaveBeenCalledWith(paths[0]);

    spy.mockRestore();
  });

  it("only opens the first path when invoke returns multiple paths", async () => {
    const paths = ["/a.md", "/b.md", "/c.md"];
    (invoke as Mock).mockResolvedValueOnce(paths);

    const spy = vi.spyOn(fileOps, "readDroppedFile").mockResolvedValue(undefined);

    render(<App />);
    await act(async () => {});

    expect(spy).toHaveBeenCalledOnce();

    spy.mockRestore();
  });

  it("does not call readDroppedFile when invoke returns an empty array", async () => {
    (invoke as Mock).mockResolvedValueOnce([]);

    const spy = vi.spyOn(fileOps, "readDroppedFile");

    render(<App />);
    await act(async () => {});

    expect(spy).not.toHaveBeenCalled();

    spy.mockRestore();
  });
});

// ---------------------------------------------------------------------------

describe("App — warm open: listen('file-open')", () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  it("calls listen with 'file-open' on mount", async () => {
    (listen as Mock).mockResolvedValueOnce(vi.fn());

    render(<App />);
    await act(async () => {});

    expect(listen).toHaveBeenCalledWith("file-open", expect.any(Function));
  });

  it("registers exactly one 'file-open' listener per mount", async () => {
    (listen as Mock).mockResolvedValueOnce(vi.fn());

    render(<App />);
    await act(async () => {});

    const listenCalls = (listen as Mock).mock.calls.filter(
      (args: unknown[]) => args[0] === "file-open",
    );
    expect(listenCalls).toHaveLength(1);
  });

  it("calls the unlisten function returned by listen on unmount", async () => {
    const mockUnlisten = vi.fn();
    (listen as Mock).mockResolvedValueOnce(mockUnlisten);

    const { unmount } = render(<App />);
    await act(async () => {});

    unmount();
    await act(async () => {});

    expect(mockUnlisten).toHaveBeenCalledOnce();
  });

  it("calls readDroppedFile with the first path when a file-open event fires", async () => {
    let capturedHandler: ((event: { payload: string[] }) => void) | undefined;

    (listen as Mock).mockImplementationOnce(
      (_event: string, handler: typeof capturedHandler) => {
        capturedHandler = handler;
        return Promise.resolve(vi.fn());
      },
    );

    const spy = vi.spyOn(fileOps, "readDroppedFile").mockResolvedValueOnce(undefined);

    render(<App />);
    await act(async () => {});

    act(() => {
      capturedHandler?.({ payload: ["/Users/mike/warm.md"] });
    });

    expect(spy).toHaveBeenCalledOnce();
    expect(spy).toHaveBeenCalledWith("/Users/mike/warm.md");

    spy.mockRestore();
  });

  it("only opens the first path when file-open payload contains multiple paths", async () => {
    let capturedHandler: ((event: { payload: string[] }) => void) | undefined;

    (listen as Mock).mockImplementationOnce(
      (_event: string, handler: typeof capturedHandler) => {
        capturedHandler = handler;
        return Promise.resolve(vi.fn());
      },
    );

    const spy = vi.spyOn(fileOps, "readDroppedFile").mockResolvedValue(undefined);

    render(<App />);
    await act(async () => {});

    act(() => {
      capturedHandler?.({ payload: ["/a.md", "/b.md"] });
    });

    expect(spy).toHaveBeenCalledOnce();
    expect(spy).toHaveBeenCalledWith("/a.md");

    spy.mockRestore();
  });

  it("does not call readDroppedFile when file-open payload is empty", async () => {
    let capturedHandler: ((event: { payload: string[] }) => void) | undefined;

    (listen as Mock).mockImplementationOnce(
      (_event: string, handler: typeof capturedHandler) => {
        capturedHandler = handler;
        return Promise.resolve(vi.fn());
      },
    );

    const spy = vi.spyOn(fileOps, "readDroppedFile");

    render(<App />);
    await act(async () => {});

    act(() => {
      capturedHandler?.({ payload: [] });
    });

    expect(spy).not.toHaveBeenCalled();

    spy.mockRestore();
  });

  it("handles multiple sequential file-open events independently", async () => {
    let capturedHandler: ((event: { payload: string[] }) => void) | undefined;

    (listen as Mock).mockImplementationOnce(
      (_event: string, handler: typeof capturedHandler) => {
        capturedHandler = handler;
        return Promise.resolve(vi.fn());
      },
    );

    const spy = vi.spyOn(fileOps, "readDroppedFile").mockResolvedValue(undefined);

    render(<App />);
    await act(async () => {});

    act(() => {
      capturedHandler?.({ payload: ["/first.md"] });
    });
    act(() => {
      capturedHandler?.({ payload: ["/second.md"] });
    });

    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenNthCalledWith(1, "/first.md");
    expect(spy).toHaveBeenNthCalledWith(2, "/second.md");

    spy.mockRestore();
  });
});
