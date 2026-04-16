/**
 * Tests for multi-tab functionality in appStore
 */

import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { useAppStore } from "@/store/appStore";

function resetStore() {
  // Reset to a fresh single-tab state
  useAppStore.setState({
    tabs: [{ id: "test-tab-1", markdownContent: "", htmlContent: "", fileName: "No file opened", filePath: "", wordCount: 0, readingTime: 0, dirty: false, scrollTop: 0 }],
    activeTabId: "test-tab-1",
    markdownContent: "",
    htmlContent: "",
    fileName: "No file opened",
    filePath: "",
    wordCount: 0,
    readingTime: 0,
    dirty: false,
    editMode: false,
    sidebarCollapsed: false,
    isDragOver: false,
    isDropZoneVisible: true,
    theme: "dark" as const,
    fontSize: 100,
    searchOpen: false,
    keybindingMode: "default" as const,
    toastMessage: "",
    toastVisible: false,
    recentFiles: [],
  });
  try { localStorage.clear(); } catch { /* noop */ }
}

function get() {
  return useAppStore.getState();
}

describe("appStore — tabs: newTab", () => {
  beforeEach(resetStore);

  it("creates a new empty tab", () => {
    get().newTab();
    expect(get().tabs).toHaveLength(2);
  });

  it("sets the new tab as active", () => {
    const oldId = get().activeTabId;
    get().newTab();
    expect(get().activeTabId).not.toBe(oldId);
  });

  it("new tab has empty content", () => {
    get().newTab();
    expect(get().markdownContent).toBe("");
    expect(get().fileName).toBe("No file opened");
  });

  it("shows drop zone for new tab", () => {
    get().loadMarkdown("# Test", "test.md");
    expect(get().isDropZoneVisible).toBe(false);
    get().newTab();
    expect(get().isDropZoneVisible).toBe(true);
  });
});

describe("appStore — tabs: closeTab", () => {
  beforeEach(resetStore);

  it("closing the last tab resets to an empty tab", () => {
    const id = get().activeTabId;
    get().closeTab(id);
    expect(get().tabs).toHaveLength(1);
    expect(get().markdownContent).toBe("");
    expect(get().isDropZoneVisible).toBe(true);
  });

  it("closing a non-active tab preserves the active tab", () => {
    get().loadMarkdown("# First", "first.md", "/first.md");
    get().newTab();
    get().loadMarkdown("# Second", "second.md", "/second.md");
    const secondId = get().activeTabId;
    const firstId = get().tabs.find((t) => t.id !== secondId)!.id;

    get().closeTab(firstId);
    expect(get().tabs).toHaveLength(1);
    expect(get().activeTabId).toBe(secondId);
    expect(get().fileName).toBe("second.md");
  });

  it("closing the active tab switches to the next tab", () => {
    get().loadMarkdown("# First", "first.md", "/first.md");
    const firstId = get().activeTabId;
    get().newTab();
    get().loadMarkdown("# Second", "second.md", "/second.md");
    const secondId = get().activeTabId;

    // Switch back to first and close it
    get().setActiveTab(firstId);
    get().closeTab(firstId);
    expect(get().activeTabId).toBe(secondId);
  });
});

describe("appStore — tabs: setActiveTab", () => {
  beforeEach(resetStore);

  it("switches the active tab", () => {
    get().loadMarkdown("# First", "first.md", "/first.md");
    const firstId = get().activeTabId;
    get().newTab();
    get().loadMarkdown("# Second", "second.md");

    get().setActiveTab(firstId);
    expect(get().activeTabId).toBe(firstId);
    expect(get().fileName).toBe("first.md");
  });

  it("updates derived fields from the new active tab", () => {
    get().loadMarkdown("hello world", "first.md");
    const firstId = get().activeTabId;
    get().newTab();
    get().loadMarkdown("one two three four five", "second.md");

    expect(get().wordCount).toBe(5);
    get().setActiveTab(firstId);
    expect(get().wordCount).toBe(2);
  });

  it("ignores invalid tab id", () => {
    const before = get().activeTabId;
    get().setActiveTab("nonexistent-id");
    expect(get().activeTabId).toBe(before);
  });
});

describe("appStore — tabs: loadMarkdown with tabs", () => {
  beforeEach(resetStore);

  it("loads into current tab when it is untouched", () => {
    get().loadMarkdown("# Hello", "hello.md");
    expect(get().tabs).toHaveLength(1);
    expect(get().fileName).toBe("hello.md");
  });

  it("opens a new tab when current tab has content", () => {
    get().loadMarkdown("# First", "first.md", "/first.md");
    get().loadMarkdown("# Second", "second.md", "/second.md");
    expect(get().tabs).toHaveLength(2);
    expect(get().fileName).toBe("second.md");
  });

  it("switches to existing tab when opening a file that is already open", () => {
    get().loadMarkdown("# First", "first.md", "/first.md");
    const firstId = get().activeTabId;
    get().newTab();
    get().loadMarkdown("# Second", "second.md", "/second.md");
    expect(get().tabs).toHaveLength(2);

    // Open first.md again — should switch to existing tab
    get().loadMarkdown("# First Updated", "first.md", "/first.md");
    expect(get().tabs).toHaveLength(2);
    expect(get().activeTabId).toBe(firstId);
    expect(get().markdownContent).toBe("# First Updated");
  });
});

describe("appStore — keybinding mode", () => {
  beforeEach(resetStore);

  it("defaults to 'default'", () => {
    expect(get().keybindingMode).toBe("default");
  });

  it("setKeybindingMode changes the mode", () => {
    get().setKeybindingMode("vim");
    expect(get().keybindingMode).toBe("vim");
  });

  it("cycleKeybindingMode cycles through modes", () => {
    expect(get().keybindingMode).toBe("default");
    get().cycleKeybindingMode();
    expect(get().keybindingMode).toBe("vim");
    get().cycleKeybindingMode();
    expect(get().keybindingMode).toBe("emacs");
    get().cycleKeybindingMode();
    expect(get().keybindingMode).toBe("default");
  });

  it("persists keybinding mode to localStorage", () => {
    get().setKeybindingMode("emacs");
    expect(localStorage.getItem("mikedown-keybinding")).toBe("emacs");
  });
});

describe("appStore — exportToPdf", () => {
  it("exportToPdf is importable from exportOps", async () => {
    const { exportToPdf } = await import("@/lib/exportOps");
    expect(typeof exportToPdf).toBe("function");
  });
});

// ---------------------------------------------------------------------------

describe("appStore — restoreSession + file-association race", () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  it("does not override an already-active file that was loaded via file-association", async () => {
    // Simulate previous session: two legacy files, second one was active.
    localStorage.setItem(
      "mikedown-session",
      JSON.stringify({
        filePaths: ["/legacy1.md", "/legacy2.md"],
        activeIndex: 1,
      }),
    );

    // Use deferred promises so we can interleave restoreSession with a
    // concurrent file-association load.
    let resolveLegacy1: (v: string) => void;
    let resolveLegacy2: (v: string) => void;
    const legacy1Pending = new Promise<string>((res) => { resolveLegacy1 = res; });
    const legacy2Pending = new Promise<string>((res) => { resolveLegacy2 = res; });
    (readTextFile as unknown as Mock).mockImplementation((p: string) => {
      if (p === "/legacy1.md") return legacy1Pending;
      if (p === "/legacy2.md") return legacy2Pending;
      throw new Error(`unexpected path: ${p}`);
    });

    // Kick off restoreSession. It synchronously reads session data from
    // localStorage (capturing the legacy filePaths + activeIndex=1 in memory)
    // and then awaits the first readTextFile.
    const restorePromise = get().restoreSession();

    // Flush microtasks so restoreSession reaches its first await.
    await Promise.resolve();
    await Promise.resolve();

    // File-association fires now — target.md loads into the initial empty tab.
    // This also overwrites mikedown-session in localStorage with [/target.md],
    // but restoreSession already holds the legacy data in its own closure.
    get().loadMarkdown("# Target", "target.md", "/target.md");
    expect(get().fileName).toBe("target.md");

    // Now let the legacy reads finish — restoreSession will append two new tabs
    // and then call setActiveTab(tabsWithPaths[activeIndex]) at the end.
    resolveLegacy1!("# Legacy 1");
    resolveLegacy2!("# Legacy 2");
    await restorePromise;

    // The user opened target.md — they must still see target.md, not a legacy file.
    expect(get().fileName).toBe("target.md");
    expect(get().filePath).toBe("/target.md");
  });

  it("still restores the previously-active file when no other file was loaded", async () => {
    localStorage.setItem(
      "mikedown-session",
      JSON.stringify({
        filePaths: ["/a.md", "/b.md", "/c.md"],
        activeIndex: 2,
      }),
    );

    (readTextFile as unknown as Mock).mockImplementation(async (p: string) => {
      if (p === "/a.md") return "# A";
      if (p === "/b.md") return "# B";
      if (p === "/c.md") return "# C";
      throw new Error(`unexpected path: ${p}`);
    });

    await get().restoreSession();

    // With no competing file-association load, the session's activeIndex should win.
    expect(get().fileName).toBe("c.md");
    expect(get().filePath).toBe("/c.md");
  });
});
