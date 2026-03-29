# MikeDown Audit Roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement all audit roadmap items: release pipeline, Homebrew, image error handling, E2E test, footnotes, strikethrough tests, data URI support, large file performance.

**Architecture:** 8 independent tasks touching CI config, markdown pipeline, renderer, TOC, and store. No shared dependencies between tasks.

**Tech Stack:** GitHub Actions + tauri-action, marked-footnote, Playwright, DOMPurify config, CSS

---

### Task 1: data: URI image support

**Files:**
- Modify: `src/lib/markdown.ts:150-153` (DOMPurify config)
- Modify: `src/test/markdown.test.ts` (add test)

- [ ] **Step 1: Write failing test**

In `src/test/markdown.test.ts`, add:
```typescript
it("preserves data: URI images", () => {
  const html = parseMarkdown('![img](data:image/png;base64,abc123)');
  expect(html).toContain('src="data:image/png;base64,abc123"');
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `pnpm test -- --reporter=verbose src/test/markdown.test.ts`
Expected: FAIL — DOMPurify strips data: URIs by default

- [ ] **Step 3: Add ADD_DATA_URI_TAGS to DOMPurify config**

In `src/lib/markdown.ts`, update the sanitize call:
```typescript
const sanitized = DOMPurify.sanitize(raw, {
  ADD_ATTR: ["data-copy"],
  ADD_DATA_URI_TAGS: ["img"],
  ADD_TAGS: ["math", "semantics", ...],
});
```

- [ ] **Step 4: Run test, verify it passes**

Run: `pnpm test`
Expected: All tests pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/markdown.ts src/test/markdown.test.ts
git commit -m "feat: allow data: URI images in markdown"
```

---

### Task 2: Strikethrough test coverage

**Files:**
- Modify: `src/test/markdown.test.ts` (add tests)

- [ ] **Step 1: Write tests**

```typescript
describe("parseMarkdown — strikethrough", () => {
  it("renders ~~text~~ as <del> tag", () => {
    const html = parseMarkdown("~~deleted~~");
    expect(html).toContain("<del>");
    expect(html).toContain("deleted");
    expect(html).toContain("</del>");
  });

  it("renders strikethrough inline with other text", () => {
    const html = parseMarkdown("keep ~~remove~~ keep");
    expect(html).toContain("keep");
    expect(html).toContain("<del>remove</del>");
  });
});
```

- [ ] **Step 2: Run tests, verify they pass**

Run: `pnpm test`
Expected: All pass (GFM is already enabled, these confirm it works)

- [ ] **Step 3: Commit**

```bash
git add src/test/markdown.test.ts
git commit -m "test: add strikethrough rendering coverage"
```

---

### Task 3: Footnote support

**Files:**
- Modify: `package.json` (add marked-footnote)
- Modify: `src/lib/markdown.ts` (register plugin, add DOMPurify attrs)
- Modify: `src/index.css` (footnote styles)
- Modify: `src/test/markdown.test.ts` (add tests)

- [ ] **Step 1: Install marked-footnote**

Run: `pnpm add marked-footnote`

- [ ] **Step 2: Write failing test**

```typescript
describe("parseMarkdown — footnotes", () => {
  it("renders footnote reference and definition", () => {
    const md = "Text with a footnote[^1].\n\n[^1]: Footnote content.";
    const html = parseMarkdown(md);
    expect(html).toContain("footnote");
    expect(html).toContain("Footnote content");
  });
});
```

- [ ] **Step 3: Run test, verify it fails**

Expected: FAIL — footnote syntax is rendered as plain text

- [ ] **Step 4: Register marked-footnote plugin**

In `src/lib/markdown.ts`:
```typescript
import markedFootnote from "marked-footnote";
// After the existing marked.use({ renderer, breaks: true, gfm: true }):
marked.use(markedFootnote());
```

Update DOMPurify config to allow footnote attributes:
```typescript
ADD_ATTR: ["data-copy", "data-footnote-ref", "data-footnote-backref"],
```

- [ ] **Step 5: Add footnote CSS**

In `src/index.css`, after the existing strikethrough/details styles:
```css
/* -- Footnotes -- */
.content .footnotes { margin-top: 2em; padding-top: 1em; border-top: 1px solid var(--border); font-size: 0.9em; }
.content .footnotes ol { padding-left: 1.5em; }
.content .footnotes li { margin: 0.4em 0; color: var(--text-dim); }
.content sup a[data-footnote-ref] { color: var(--accent); text-decoration: none; font-weight: 600; }
.content a[data-footnote-backref] { color: var(--accent); text-decoration: none; margin-left: 4px; }
```

- [ ] **Step 6: Run tests, verify all pass**

Run: `pnpm test`

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml src/lib/markdown.ts src/index.css src/test/markdown.test.ts
git commit -m "feat: add footnote support via marked-footnote plugin"
```

---

### Task 4: Image error handling

**Files:**
- Modify: `src/components/MarkdownRenderer.tsx:57-67` (add onerror)
- Modify: `src/index.css` (add .img-error style)
- Modify: `src/test/components.test.tsx` (add test)

- [ ] **Step 1: Write failing test**

In components.test.tsx, in the MarkdownRenderer describe block:
```typescript
it("replaces broken images with error placeholder when filePath is set", async () => {
  useAppStore.setState({
    htmlContent: '<img src="missing.png" alt="test">',
    filePath: "/Users/me/docs/readme.md",
  });
  const { container } = render(<MarkdownRenderer />);
  const img = container.querySelector("img") as HTMLImageElement;
  // Simulate error event
  fireEvent.error(img);
  const placeholder = container.querySelector(".img-error");
  expect(placeholder).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test, verify it fails**

- [ ] **Step 3: Update resolveLocalImages to attach onerror**

In `src/components/MarkdownRenderer.tsx`, update `resolveLocalImages`:
```typescript
function resolveLocalImages(el: HTMLElement, filePath: string) {
  if (!filePath) return;
  const fileDir = filePath.replace(/[/\\][^/\\]*$/, "");
  const imgs = el.querySelectorAll<HTMLImageElement>("img");
  for (const img of Array.from(imgs)) {
    const src = img.getAttribute("src");
    if (src && isLocalPath(src)) {
      img.src = resolveImageSrc(src, fileDir);
      img.onerror = () => {
        const placeholder = document.createElement("div");
        placeholder.className = "img-error";
        placeholder.textContent = `Image not found: ${src}`;
        img.replaceWith(placeholder);
      };
    }
  }
}
```

- [ ] **Step 4: Add CSS for .img-error**

In `src/index.css`:
```css
.content .img-error {
  padding: 12px 16px;
  background: var(--surface);
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  color: var(--text-dim);
  font-size: 0.85em;
  margin: 0.8em 0;
}
```

- [ ] **Step 5: Run tests, verify all pass**

- [ ] **Step 6: Commit**

```bash
git add src/components/MarkdownRenderer.tsx src/index.css src/test/components.test.tsx
git commit -m "feat: show styled placeholder for broken local images"
```

---

### Task 5: Large file performance

**Files:**
- Modify: `src/store/appStore.ts:274-301` (debounce re-parse in edit mode)
- Modify: `src/components/Toc.tsx` (cap heading scan)
- Modify: `src/test/appStore.test.ts` (add debounce test)

- [ ] **Step 1: Add debounced setMarkdownContent**

In `src/store/appStore.ts`, add a parse debounce timer alongside autoSaveTimer:
```typescript
let parseTimer: ReturnType<typeof setTimeout> | undefined;
```

Update `setMarkdownContent`:
```typescript
setMarkdownContent: (content) => {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const readMin = Math.ceil(words / 200);

  // Immediate: update raw content and stats (keeps editor responsive)
  set((s) => {
    const tabs = updateActiveTab(s, {
      markdownContent: content,
      wordCount: words,
      readingTime: readMin,
      dirty: true,
    });
    return deriveFromActiveTab(tabs, s.activeTabId);
  });

  // Debounced: re-parse markdown (expensive for large files)
  clearTimeout(parseTimer);
  parseTimer = setTimeout(() => {
    const html = parseMarkdown(content);
    set((s) => {
      const tabs = updateActiveTab(s, { htmlContent: html });
      return deriveFromActiveTab(tabs, s.activeTabId);
    });
  }, 150);

  // Debounced auto-save to localStorage
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    const s = useAppStore.getState();
    safeSetItem("mikedown-draft", JSON.stringify({
      content,
      fileName: s.fileName,
      filePath: s.filePath,
      timestamp: Date.now(),
    }));
  }, 1000);
},
```

- [ ] **Step 2: Cap TOC heading scan**

In `src/components/Toc.tsx`, after the querySelectorAll:
```typescript
const allHeadings = document.querySelectorAll(
  ".content h1, .content h2, .content h3, .content h4",
);
const headings = Array.from(allHeadings).slice(0, 500);
```

Apply same cap in the scroll-spy effect.

- [ ] **Step 3: Run tests, fix any that break from the debounce change**

The store tests that call `setMarkdownContent` and immediately check `htmlContent` will need adjustment — the HTML update is now debounced. Either flush timers in tests or keep `loadMarkdown` synchronous (it already is — only edit-mode uses setMarkdownContent).

Run: `pnpm test`

- [ ] **Step 4: Commit**

```bash
git add src/store/appStore.ts src/components/Toc.tsx src/test/appStore.test.ts
git commit -m "perf: debounce markdown re-parse in edit mode, cap TOC at 500 headings"
```

---

### Task 6: Automated release pipeline

**Files:**
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: Create release workflow**

```yaml
name: Release

on:
  push:
    tags: ['v*']

jobs:
  release:
    permissions:
      contents: write
    strategy:
      fail-fast: false
      matrix:
        include:
          - platform: macos-latest
            args: --target aarch64-apple-darwin
          - platform: macos-latest
            args: --target x86_64-apple-darwin
          - platform: ubuntu-latest
            args: ''
          - platform: windows-latest
            args: ''
    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v4

      - uses: dtolnay/rust-toolchain@stable
        with:
          targets: aarch64-apple-darwin,x86_64-apple-darwin

      - name: Install system dependencies (Ubuntu)
        if: matrix.platform == 'ubuntu-latest'
        run: |
          sudo apt-get update
          sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.1-dev librsvg2-dev patchelf

      - uses: Swatinem/rust-cache@v2
        with:
          workspaces: src-tauri

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - uses: tauri-apps/tauri-action@v0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tagName: ${{ github.ref_name }}
          releaseName: 'MikeDown ${{ github.ref_name }}'
          releaseBody: 'See the [changelog](https://github.com/MichaelZuo-AI/Mikedown#changelog) for details.'
          releaseDraft: true
          prerelease: false
          args: ${{ matrix.args }}
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: add automated release pipeline with tauri-action"
```

---

### Task 7: Remove premature Homebrew claim from README

**Files:**
- Modify: `README.md:35-40`

- [ ] **Step 1: Update README**

Replace the Homebrew section with a "coming soon" note:
```markdown
### Homebrew (coming soon)

Homebrew cask will be available after the first GitHub Release is published.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: mark Homebrew install as coming soon"
```

---

### Task 8: E2E smoke test

**Files:**
- Create: `e2e/smoke.spec.ts`
- Modify: `package.json` (add playwright dev dep and e2e script)

- [ ] **Step 1: Install Playwright**

Run: `pnpm add -D @playwright/test`

- [ ] **Step 2: Create smoke test**

Create `e2e/smoke.spec.ts`:
```typescript
import { test, expect } from "@playwright/test";

test("app loads and renders drop zone", async ({ page }) => {
  await page.goto("http://localhost:1420");
  await expect(page.locator(".drop-zone")).toBeVisible();
  await expect(page.locator(".drop-icon")).toBeVisible();
});

test("renders pasted markdown content", async ({ page }) => {
  await page.goto("http://localhost:1420");
  // Simulate loading markdown by evaluating store action
  await page.evaluate(() => {
    const event = new ClipboardEvent("paste", {
      clipboardData: new DataTransfer(),
    });
    Object.defineProperty(event, "clipboardData", {
      value: { getData: () => "# Hello E2E\n\nThis is a test." },
    });
    window.dispatchEvent(event);
  });
  await expect(page.locator("h1")).toContainText("Hello E2E");
  await expect(page.locator(".content p")).toContainText("This is a test");
});
```

- [ ] **Step 3: Add playwright config**

Create `playwright.config.ts`:
```typescript
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  webServer: {
    command: "pnpm dev",
    port: 1420,
    reuseExistingServer: true,
  },
});
```

- [ ] **Step 4: Add e2e script to package.json**

```json
"e2e": "playwright test"
```

- [ ] **Step 5: Run E2E tests locally**

Run: `pnpm e2e`

- [ ] **Step 6: Commit**

```bash
git add e2e/ playwright.config.ts package.json pnpm-lock.yaml
git commit -m "test: add Playwright E2E smoke tests"
```
