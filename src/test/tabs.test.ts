/**
 * Tests for multi-tab functionality in appStore
 */

import { describe, it, expect, beforeEach } from "vitest";
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
