/**
 * Tests for the smaller React components:
 *   - ProgressBar
 *   - DropZone
 *   - Toolbar
 *   - MarkdownRenderer
 *   - Sidebar (structural/state only; file dialog mocked)
 *
 * Strategy: render each component in isolation, feeding state through the
 * Zustand store. This avoids coupling tests to the full App tree while still
 * exercising the real component logic and store subscriptions.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { useAppStore } from "@/store/appStore";
import ProgressBar from "@/components/ProgressBar";
import DropZone from "@/components/DropZone";
import Toolbar from "@/components/Toolbar";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import Sidebar from "@/components/Sidebar";

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
  theme: "dark" as const,
  fontSize: 100,
};

function resetStore() {
  useAppStore.setState(INITIAL_STATE);
}

// ---------------------------------------------------------------------------

describe("ProgressBar", () => {
  it("renders a div with the correct width style", () => {
    const { container } = render(<ProgressBar progress={42} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el).toHaveStyle({ width: "42%" });
  });

  it("renders 0% width when progress is 0", () => {
    const { container } = render(<ProgressBar progress={0} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el).toHaveStyle({ width: "0%" });
  });

  it("renders 100% width when progress is 100", () => {
    const { container } = render(<ProgressBar progress={100} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el).toHaveStyle({ width: "100%" });
  });

  it("applies the 'progress' CSS class", () => {
    const { container } = render(<ProgressBar progress={50} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toContain("progress");
  });

  it("updates width when progress prop changes", () => {
    const { container, rerender } = render(<ProgressBar progress={10} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el).toHaveStyle({ width: "10%" });

    rerender(<ProgressBar progress={75} />);
    expect(el).toHaveStyle({ width: "75%" });
  });
});

// ---------------------------------------------------------------------------

describe("DropZone", () => {
  beforeEach(resetStore);

  it("renders the drop instruction text", () => {
    render(<DropZone />);
    expect(screen.getByText("Drop a Markdown file here")).toBeInTheDocument();
  });

  it("renders the supported extensions hint", () => {
    render(<DropZone />);
    expect(screen.getByText(".md, .markdown, .txt")).toBeInTheDocument();
  });

  it("renders an 'Open File' button", () => {
    render(<DropZone />);
    expect(screen.getByRole("button", { name: /open file/i })).toBeInTheDocument();
  });

  it("has class 'drop-zone' by default", () => {
    const { container } = render(<DropZone />);
    expect(container.firstElementChild?.className).toContain("drop-zone");
  });

  it("does NOT include 'hidden' class when isDropZoneVisible is true", () => {
    useAppStore.setState({ isDropZoneVisible: true });
    const { container } = render(<DropZone />);
    expect(container.firstElementChild?.className).not.toContain("hidden");
  });

  it("includes 'hidden' class when isDropZoneVisible is false", () => {
    useAppStore.setState({ isDropZoneVisible: false });
    const { container } = render(<DropZone />);
    expect(container.firstElementChild?.className).toContain("hidden");
  });

  it("includes 'dragover' class when isDragOver is true", () => {
    useAppStore.setState({ isDragOver: true });
    const { container } = render(<DropZone />);
    expect(container.firstElementChild?.className).toContain("dragover");
  });

  it("does NOT include 'dragover' class when isDragOver is false", () => {
    useAppStore.setState({ isDragOver: false });
    const { container } = render(<DropZone />);
    expect(container.firstElementChild?.className).not.toContain("dragover");
  });

  it("can have both 'hidden' and 'dragover' classes simultaneously", () => {
    useAppStore.setState({ isDropZoneVisible: false, isDragOver: true });
    const { container } = render(<DropZone />);
    const cls = container.firstElementChild?.className ?? "";
    expect(cls).toContain("hidden");
    expect(cls).toContain("dragover");
  });

  it("updates visibility reactively when store changes", () => {
    useAppStore.setState({ isDropZoneVisible: true });
    const { container } = render(<DropZone />);
    expect(container.firstElementChild?.className).not.toContain("hidden");

    // Simulate file load hiding the drop zone — must be wrapped in act()
    act(() => {
      useAppStore.setState({ isDropZoneVisible: false });
    });
    expect(container.firstElementChild?.className).toContain("hidden");
  });
});

// ---------------------------------------------------------------------------

describe("Toolbar", () => {
  beforeEach(resetStore);

  it("displays the current file name", () => {
    useAppStore.setState({ fileName: "my-file.md" });
    render(<Toolbar />);
    expect(screen.getByText("my-file.md")).toBeInTheDocument();
  });

  it("shows 'No file opened' by default", () => {
    render(<Toolbar />);
    expect(screen.getByText("No file opened")).toBeInTheDocument();
  });

  it("shows no word-count stats when wordCount is 0", () => {
    useAppStore.setState({ wordCount: 0 });
    render(<Toolbar />);
    // The word-count span should be empty
    const span = screen.getByText("", { selector: ".word-count" });
    expect(span.textContent).toBe("");
  });

  it("shows word count stats when wordCount > 0", () => {
    useAppStore.setState({ wordCount: 500, readingTime: 3 });
    render(<Toolbar />);
    expect(screen.getByText(/500/)).toBeInTheDocument();
    expect(screen.getByText(/3 min read/)).toBeInTheDocument();
  });

  it("formats large word counts with toLocaleString", () => {
    useAppStore.setState({ wordCount: 1200, readingTime: 6 });
    render(<Toolbar />);
    // toLocaleString(1200) = '1,200' in en-US
    const statsEl = screen.getByText(/words/);
    expect(statsEl.textContent).toMatch(/1[,.]?200/);
  });

  it("shows the sun icon (☀) when theme is dark", () => {
    useAppStore.setState({ theme: "dark" });
    render(<Toolbar />);
    expect(screen.getByTitle("Toggle theme").textContent).toContain("☀");
  });

  it("shows the moon icon (🌙) when theme is light", () => {
    useAppStore.setState({ theme: "light" });
    render(<Toolbar />);
    expect(screen.getByTitle("Toggle theme").textContent).toContain("🌙");
  });

  it("clicking toggle-theme switches from dark to light", () => {
    useAppStore.setState({ theme: "dark" });
    render(<Toolbar />);
    fireEvent.click(screen.getByTitle("Toggle theme"));
    expect(useAppStore.getState().theme).toBe("light");
  });

  it("clicking toggle-theme switches from light to dark", () => {
    useAppStore.setState({ theme: "light" });
    render(<Toolbar />);
    fireEvent.click(screen.getByTitle("Toggle theme"));
    expect(useAppStore.getState().theme).toBe("dark");
  });

  it("clicking zoom-in increases font size by 10", () => {
    useAppStore.setState({ fontSize: 100 });
    render(<Toolbar />);
    fireEvent.click(screen.getByTitle("Zoom in"));
    expect(useAppStore.getState().fontSize).toBe(110);
  });

  it("clicking zoom-out decreases font size by 10", () => {
    useAppStore.setState({ fontSize: 100 });
    render(<Toolbar />);
    fireEvent.click(screen.getByTitle("Zoom out"));
    expect(useAppStore.getState().fontSize).toBe(90);
  });

  it("clicking toggle-sidebar collapses the sidebar", () => {
    useAppStore.setState({ sidebarCollapsed: false });
    render(<Toolbar />);
    fireEvent.click(screen.getByTitle("Toggle sidebar"));
    expect(useAppStore.getState().sidebarCollapsed).toBe(true);
  });

  it("clicking toggle-sidebar expands a collapsed sidebar", () => {
    useAppStore.setState({ sidebarCollapsed: true });
    render(<Toolbar />);
    fireEvent.click(screen.getByTitle("Toggle sidebar"));
    expect(useAppStore.getState().sidebarCollapsed).toBe(false);
  });
});

// ---------------------------------------------------------------------------

describe("MarkdownRenderer", () => {
  beforeEach(resetStore);

  it("renders a container div with class 'content'", () => {
    const { container } = render(<MarkdownRenderer />);
    const div = container.querySelector(".content");
    expect(div).toBeInTheDocument();
  });

  it("applies font size from the store as a rem style", () => {
    useAppStore.setState({ fontSize: 120 });
    const { container } = render(<MarkdownRenderer />);
    const div = container.querySelector(".content") as HTMLElement;
    expect(div.style.fontSize).toBe("1.2rem");
  });

  it("applies 100% font size as 1rem by default", () => {
    useAppStore.setState({ fontSize: 100 });
    const { container } = render(<MarkdownRenderer />);
    const div = container.querySelector(".content") as HTMLElement;
    expect(div.style.fontSize).toBe("1rem");
  });

  it("renders HTML content from the store via dangerouslySetInnerHTML", () => {
    useAppStore.setState({ htmlContent: "<h1>Hello</h1><p>World</p>" });
    const { container } = render(<MarkdownRenderer />);
    expect(container.querySelector("h1")?.textContent).toBe("Hello");
    expect(container.querySelector("p")?.textContent).toBe("World");
  });

  it("renders empty content when htmlContent is empty string", () => {
    useAppStore.setState({ htmlContent: "" });
    const { container } = render(<MarkdownRenderer />);
    const div = container.querySelector(".content") as HTMLElement;
    expect(div.innerHTML).toBe("");
  });

  it("updates rendered content reactively when store changes", () => {
    useAppStore.setState({ htmlContent: "<p>First</p>" });
    const { container } = render(<MarkdownRenderer />);
    expect(container.querySelector("p")?.textContent).toBe("First");

    act(() => {
      useAppStore.setState({ htmlContent: "<p>Second</p>" });
    });
    expect(container.querySelector("p")?.textContent).toBe("Second");
  });

  it("copy button click calls clipboard.writeText with the code content", async () => {
    // Set up a code block in the HTML content
    const html = `
      <pre>
        <div class="code-header">
          <span class="code-lang">js</span>
          <button class="copy-btn" data-copy>Copy</button>
        </div>
        <code>const x = 1;</code>
      </pre>
    `;
    useAppStore.setState({ htmlContent: html });
    const { container } = render(<MarkdownRenderer />);

    const copyBtn = container.querySelector("[data-copy]") as HTMLButtonElement;
    expect(copyBtn).not.toBeNull();

    // Mock clipboard API
    const clipboardWriteText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: clipboardWriteText },
      writable: true,
      configurable: true,
    });

    // Click the button directly — its click event bubbles up to the .content div
    // where the delegated handler lives
    await act(async () => {
      fireEvent.click(copyBtn);
    });

    // The handler reads code.textContent from the nearest <code> sibling inside <pre>
    expect(clipboardWriteText).toHaveBeenCalledOnce();
    expect(clipboardWriteText).toHaveBeenCalledWith("const x = 1;");
  });

  it("renders the Copy button text initially", () => {
    const html = `
      <pre>
        <div class="code-header">
          <span class="code-lang">js</span>
          <button class="copy-btn" data-copy>Copy</button>
        </div>
        <code>const x = 1;</code>
      </pre>
    `;
    useAppStore.setState({ htmlContent: html });
    const { container } = render(<MarkdownRenderer />);
    const copyBtn = container.querySelector("[data-copy]") as HTMLButtonElement;
    expect(copyBtn.textContent).toBe("Copy");
  });
});

// ---------------------------------------------------------------------------

describe("Sidebar", () => {
  beforeEach(resetStore);

  it("renders the logo 'M'", () => {
    render(<Sidebar />);
    expect(screen.getByText("M")).toBeInTheDocument();
  });

  it("renders the logo text 'MD Viewer'", () => {
    render(<Sidebar />);
    expect(screen.getByText("MD Viewer")).toBeInTheDocument();
  });

  it("renders an 'Open File' button", () => {
    render(<Sidebar />);
    expect(screen.getByRole("button", { name: /open file/i })).toBeInTheDocument();
  });

  it("has class 'sidebar' without 'collapsed' when sidebarCollapsed is false", () => {
    useAppStore.setState({ sidebarCollapsed: false });
    const { container } = render(<Sidebar />);
    const sidebarEl = container.firstElementChild as HTMLElement;
    expect(sidebarEl.className).toContain("sidebar");
    expect(sidebarEl.className).not.toContain("collapsed");
  });

  it("has class 'sidebar collapsed' when sidebarCollapsed is true", () => {
    useAppStore.setState({ sidebarCollapsed: true });
    const { container } = render(<Sidebar />);
    const sidebarEl = container.firstElementChild as HTMLElement;
    expect(sidebarEl.className).toContain("sidebar");
    expect(sidebarEl.className).toContain("collapsed");
  });

  it("updates collapsed class reactively when store changes", () => {
    useAppStore.setState({ sidebarCollapsed: false });
    const { container } = render(<Sidebar />);
    const sidebarEl = container.firstElementChild as HTMLElement;
    expect(sidebarEl.className).not.toContain("collapsed");

    act(() => {
      useAppStore.setState({ sidebarCollapsed: true });
    });
    expect(sidebarEl.className).toContain("collapsed");
  });

  it("renders the Toc 'Contents' section", () => {
    render(<Sidebar />);
    expect(screen.getByText("Contents")).toBeInTheDocument();
  });
});
