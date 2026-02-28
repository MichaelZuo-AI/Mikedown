/**
 * Tests for src/store/appStore.ts
 *
 * Strategy: Zustand stores are plain JS objects — we can call actions directly
 * on useAppStore.getState() without any React rendering, which keeps these tests
 * fast and free of UI concerns.
 *
 * Because Zustand uses a module-level singleton, we reset state to defaults
 * before every test using setState so tests remain fully isolated.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "@/store/appStore";

// ---- helpers ----------------------------------------------------------------

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

function get() {
  return useAppStore.getState();
}

// ---- tests ------------------------------------------------------------------

describe("appStore — initial state", () => {
  beforeEach(resetStore);

  it("has correct default content fields", () => {
    expect(get().markdownContent).toBe("");
    expect(get().htmlContent).toBe("");
    expect(get().fileName).toBe("No file opened");
    expect(get().filePath).toBe("");
  });

  it("has correct default stats", () => {
    expect(get().wordCount).toBe(0);
    expect(get().readingTime).toBe(0);
  });

  it("has correct default UI fields", () => {
    expect(get().sidebarCollapsed).toBe(false);
    expect(get().isDragOver).toBe(false);
    expect(get().isDropZoneVisible).toBe(true);
  });

  it("defaults to dark theme", () => {
    expect(get().theme).toBe("dark");
  });

  it("defaults font size to 100%", () => {
    expect(get().fontSize).toBe(100);
  });
});

// ---------------------------------------------------------------------------

describe("appStore — loadMarkdown", () => {
  beforeEach(resetStore);

  it("stores the raw markdown content", () => {
    get().loadMarkdown("# Hello", "hello.md");
    expect(get().markdownContent).toBe("# Hello");
  });

  it("stores the file name", () => {
    get().loadMarkdown("text", "my-doc.md");
    expect(get().fileName).toBe("my-doc.md");
  });

  it("stores an optional file path", () => {
    get().loadMarkdown("text", "file.md", "/home/user/file.md");
    expect(get().filePath).toBe("/home/user/file.md");
  });

  it("uses empty string for file path when omitted", () => {
    get().loadMarkdown("text", "file.md");
    expect(get().filePath).toBe("");
  });

  it("falls back to 'Untitled' when name is an empty string", () => {
    get().loadMarkdown("text", "");
    expect(get().fileName).toBe("Untitled");
  });

  it("produces non-empty HTML output from markdown", () => {
    get().loadMarkdown("# Hello\n\nWorld", "test.md");
    const html = get().htmlContent;
    expect(html).toContain("<h1");
    expect(html).toContain("Hello");
  });

  it("hides the drop zone after loading", () => {
    // ensure it starts visible
    useAppStore.setState({ isDropZoneVisible: true });
    get().loadMarkdown("# Hi", "test.md");
    expect(get().isDropZoneVisible).toBe(false);
  });

  it("calculates word count for simple content", () => {
    get().loadMarkdown("one two three", "f.md");
    expect(get().wordCount).toBe(3);
  });

  it("counts words ignoring leading/trailing whitespace", () => {
    get().loadMarkdown("  hello world  ", "f.md");
    expect(get().wordCount).toBe(2);
  });

  it("reports 0 words for empty content", () => {
    get().loadMarkdown("", "empty.md");
    expect(get().wordCount).toBe(0);
  });

  it("reports 0 words for whitespace-only content", () => {
    get().loadMarkdown("   \n\t  ", "blank.md");
    expect(get().wordCount).toBe(0);
  });

  it("computes reading time as ceiling of words/200", () => {
    // Exactly 200 words → 1 min
    const exactly200 = Array(200).fill("word").join(" ");
    get().loadMarkdown(exactly200, "f.md");
    expect(get().readingTime).toBe(1);
  });

  it("rounds up to next minute when over threshold", () => {
    // 201 words → ceil(201/200) = 2 min
    const over200 = Array(201).fill("word").join(" ");
    get().loadMarkdown(over200, "f.md");
    expect(get().readingTime).toBe(2);
  });

  it("handles multi-line markdown with headings and paragraphs", () => {
    const md = "# Title\n\n## Section\n\nSome paragraph text here.";
    get().loadMarkdown(md, "doc.md");
    expect(get().wordCount).toBeGreaterThan(0);
    expect(get().htmlContent).toContain("<h1");
    expect(get().htmlContent).toContain("<h2");
  });
});

// ---------------------------------------------------------------------------

describe("appStore — toggleSidebar", () => {
  beforeEach(resetStore);

  it("collapses the sidebar when it is open", () => {
    useAppStore.setState({ sidebarCollapsed: false });
    get().toggleSidebar();
    expect(get().sidebarCollapsed).toBe(true);
  });

  it("expands the sidebar when it is collapsed", () => {
    useAppStore.setState({ sidebarCollapsed: true });
    get().toggleSidebar();
    expect(get().sidebarCollapsed).toBe(false);
  });

  it("toggles back and forth correctly", () => {
    get().toggleSidebar(); // false → true
    get().toggleSidebar(); // true → false
    expect(get().sidebarCollapsed).toBe(false);
  });
});

// ---------------------------------------------------------------------------

describe("appStore — setDragOver", () => {
  beforeEach(resetStore);

  it("sets isDragOver to true", () => {
    get().setDragOver(true);
    expect(get().isDragOver).toBe(true);
  });

  it("sets isDragOver to false", () => {
    useAppStore.setState({ isDragOver: true });
    get().setDragOver(false);
    expect(get().isDragOver).toBe(false);
  });
});

// ---------------------------------------------------------------------------

describe("appStore — showDropZone / hideDropZone", () => {
  beforeEach(resetStore);

  it("showDropZone makes isDropZoneVisible true", () => {
    useAppStore.setState({ isDropZoneVisible: false });
    get().showDropZone();
    expect(get().isDropZoneVisible).toBe(true);
  });

  it("hideDropZone makes isDropZoneVisible false", () => {
    useAppStore.setState({ isDropZoneVisible: true });
    get().hideDropZone();
    expect(get().isDropZoneVisible).toBe(false);
  });
});

// ---------------------------------------------------------------------------

describe("appStore — setTheme", () => {
  beforeEach(resetStore);

  it("sets theme to light", () => {
    get().setTheme("light");
    expect(get().theme).toBe("light");
  });

  it("sets theme to dark", () => {
    useAppStore.setState({ theme: "light" });
    get().setTheme("dark");
    expect(get().theme).toBe("dark");
  });
});

// ---------------------------------------------------------------------------

describe("appStore — toggleTheme", () => {
  beforeEach(resetStore);

  it("switches from dark to light", () => {
    useAppStore.setState({ theme: "dark" });
    get().toggleTheme();
    expect(get().theme).toBe("light");
  });

  it("switches from light to dark", () => {
    useAppStore.setState({ theme: "light" });
    get().toggleTheme();
    expect(get().theme).toBe("dark");
  });

  it("toggles correctly across multiple calls", () => {
    get().toggleTheme(); // dark → light
    get().toggleTheme(); // light → dark
    expect(get().theme).toBe("dark");
  });
});

// ---------------------------------------------------------------------------

describe("appStore — zoom", () => {
  beforeEach(resetStore);

  it("increases font size by 10 when direction is +1", () => {
    useAppStore.setState({ fontSize: 100 });
    get().zoom(1);
    expect(get().fontSize).toBe(110);
  });

  it("decreases font size by 10 when direction is -1", () => {
    useAppStore.setState({ fontSize: 100 });
    get().zoom(-1);
    expect(get().fontSize).toBe(90);
  });

  it("does not exceed the maximum of 140", () => {
    useAppStore.setState({ fontSize: 140 });
    get().zoom(1);
    expect(get().fontSize).toBe(140);
  });

  it("does not go below the minimum of 70", () => {
    useAppStore.setState({ fontSize: 70 });
    get().zoom(-1);
    expect(get().fontSize).toBe(70);
  });

  it("clamps to 140 when a single step would overshoot max", () => {
    useAppStore.setState({ fontSize: 135 });
    get().zoom(1); // would be 145, clamped to 140
    expect(get().fontSize).toBe(140);
  });

  it("clamps to 70 when a single step would undershoot min", () => {
    useAppStore.setState({ fontSize: 75 });
    get().zoom(-1); // would be 65, clamped to 70
    expect(get().fontSize).toBe(70);
  });

  it("accumulates multiple zoom-in steps", () => {
    useAppStore.setState({ fontSize: 100 });
    get().zoom(1);
    get().zoom(1);
    get().zoom(1);
    expect(get().fontSize).toBe(130);
  });

  it("accumulates mixed zoom steps", () => {
    useAppStore.setState({ fontSize: 100 });
    get().zoom(1);  // 110
    get().zoom(-1); // 100
    get().zoom(-1); // 90
    expect(get().fontSize).toBe(90);
  });

  it("ignores non-destructive calls beyond ceiling", () => {
    useAppStore.setState({ fontSize: 140 });
    get().zoom(1);
    get().zoom(1);
    expect(get().fontSize).toBe(140);
  });
});

// ---------------------------------------------------------------------------

describe("appStore — action purity (no unintended side effects)", () => {
  beforeEach(resetStore);

  it("toggleSidebar does not affect other state fields", () => {
    get().loadMarkdown("# Hi", "test.md", "/path/test.md");
    const before = { ...get() };
    get().toggleSidebar();
    const after = get();

    // Only sidebarCollapsed should change
    expect(after.markdownContent).toBe(before.markdownContent);
    expect(after.htmlContent).toBe(before.htmlContent);
    expect(after.fileName).toBe(before.fileName);
    expect(after.wordCount).toBe(before.wordCount);
    expect(after.theme).toBe(before.theme);
    expect(after.fontSize).toBe(before.fontSize);
  });

  it("zoom does not affect content state", () => {
    get().loadMarkdown("# Hi", "test.md");
    const wordCount = get().wordCount;
    get().zoom(1);
    expect(get().wordCount).toBe(wordCount);
  });

  it("setTheme does not affect UI visibility state", () => {
    get().setTheme("light");
    // isDropZoneVisible should remain at its default
    expect(get().isDropZoneVisible).toBe(true);
    expect(get().sidebarCollapsed).toBe(false);
  });
});
