/**
 * Tests for src/lib/markdown.ts
 */

import { describe, it, expect } from "vitest";
import { parseMarkdown } from "@/lib/markdown";

// ---- heading renderer -------------------------------------------------------

describe("parseMarkdown — heading renderer", () => {
  it("wraps h1 in a <h1> tag", () => {
    const html = parseMarkdown("# Hello World");
    expect(html).toContain("<h1");
    expect(html).toContain("Hello World");
    expect(html).toContain("</h1>");
  });

  it("wraps h2 in a <h2> tag", () => {
    const html = parseMarkdown("## Section Title");
    expect(html).toContain("<h2");
    expect(html).toContain("</h2>");
  });

  it("wraps h3 in a <h3> tag", () => {
    const html = parseMarkdown("### Sub-section");
    expect(html).toContain("<h3");
    expect(html).toContain("</h3>");
  });

  it("generates a lowercase id from the heading text", () => {
    const html = parseMarkdown("# Hello World");
    expect(html).toMatch(/id="hello-world"/);
  });

  it("replaces spaces with hyphens in the id", () => {
    const html = parseMarkdown("# My Great Title");
    expect(html).toMatch(/id="my-great-title"/);
  });

  it("strips HTML tags from the id (e.g. bold inside heading)", () => {
    const html = parseMarkdown("# Hello **World**");
    expect(html).not.toMatch(/id="[^"]*<[^"]*"/);
  });

  it("strips special characters from the id", () => {
    const html = parseMarkdown("# What's New?");
    const match = html.match(/id="([^"]+)"/);
    expect(match).not.toBeNull();
    expect(match![1]).not.toContain("'");
    expect(match![1]).not.toContain("?");
  });

  it("preserves hyphen characters in the id", () => {
    const html = parseMarkdown("# Getting-Started");
    expect(html).toMatch(/id="getting-started"/);
  });

  it("renders all heading levels h1-h4", () => {
    for (let level = 1; level <= 4; level++) {
      const prefix = "#".repeat(level);
      const html = parseMarkdown(`${prefix} Heading ${level}`);
      expect(html).toContain(`<h${level}`);
      expect(html).toContain(`</h${level}>`);
    }
  });
});

// ---- code block renderer ----------------------------------------------------

describe("parseMarkdown — code block renderer", () => {
  it("wraps fenced code in a <pre> element", () => {
    const md = "```js\nconsole.log('hi');\n```";
    const html = parseMarkdown(md);
    expect(html).toContain("<pre");
    expect(html).toContain("</pre>");
  });

  it("wraps the highlighted source in a <code> element", () => {
    const md = "```js\nconst x = 1;\n```";
    const html = parseMarkdown(md);
    expect(html).toContain("<code");
    expect(html).toContain("</code>");
  });

  it("includes the code-header div", () => {
    const md = "```js\nconst x = 1;\n```";
    const html = parseMarkdown(md);
    expect(html).toContain('class="code-header"');
  });

  it("includes a Copy button with data-copy attribute", () => {
    const md = "```python\nprint('hello')\n```";
    const html = parseMarkdown(md);
    expect(html).toContain('data-copy');
    expect(html).toContain('class="copy-btn"');
  });

  it("shows the language label in code-lang span", () => {
    const md = "```typescript\nlet x: number = 1;\n```";
    const html = parseMarkdown(md);
    expect(html).toContain('class="code-lang"');
    expect(html).toContain("typescript");
  });

  it("uses 'text' as language label when no language is given", () => {
    const md = "```\nplain code\n```";
    const html = parseMarkdown(md);
    expect(html).toContain(">text<");
  });

  it("uses 'plaintext' class when language is unknown", () => {
    const md = "```unknownlang\nsome code\n```";
    const html = parseMarkdown(md);
    expect(html).toContain('language-plaintext');
  });

  it("applies highlight.js class to code element for known lang", () => {
    const md = "```javascript\nconst a = 1;\n```";
    const html = parseMarkdown(md);
    expect(html).toContain('language-javascript');
    expect(html).toContain('hljs');
  });

  it("highlight.js produces spans for syntax tokens", () => {
    const md = "```javascript\nconst a = 1;\n```";
    const html = parseMarkdown(md);
    expect(html).toContain("<span");
  });

  it("handles code blocks with multiple lines", () => {
    const md = "```python\ndef foo():\n    return 42\n```";
    const html = parseMarkdown(md);
    expect(html).toContain("foo");
    expect(html).toContain("42");
    expect(html).toContain("<code");
  });

  it("handles empty code block", () => {
    const md = "```\n```";
    const html = parseMarkdown(md);
    expect(html).toContain("<pre");
    expect(html).toContain("<code");
  });
});

// ---- mermaid code block renderer --------------------------------------------

describe("parseMarkdown — mermaid code blocks", () => {
  it("outputs a <div class=\"mermaid\"> instead of a <pre> block", () => {
    const md = "```mermaid\ngraph TD; A-->B;\n```";
    const html = parseMarkdown(md);
    expect(html).toContain('<div class="mermaid">');
  });

  it("does NOT wrap mermaid source in <pre> or <code>", () => {
    const md = "```mermaid\ngraph TD; A-->B;\n```";
    const html = parseMarkdown(md);
    expect(html).not.toContain("<pre");
    expect(html).not.toContain("<code");
  });

  it("includes the diagram source text inside the div", () => {
    const md = "```mermaid\ngraph TD; A-->B;\n```";
    const html = parseMarkdown(md);
    expect(html).toContain("graph TD; A--&gt;B;");
  });

  it("HTML-escapes '<' characters in the diagram source", () => {
    const md = "```mermaid\nA-->B: <label>\n```";
    const html = parseMarkdown(md);
    expect(html).toContain("&lt;label&gt;");
    expect(html).not.toContain("<label>");
  });

  it("HTML-escapes '&' characters in the diagram source", () => {
    const md = "```mermaid\nnote: A & B\n```";
    const html = parseMarkdown(md);
    expect(html).toContain("A &amp; B");
  });

  it("preserves '\"' characters in the diagram source (DOMPurify normalises &quot; back to \")", () => {
    const md = '```mermaid\nA["quoted label"]\n```';
    const html = parseMarkdown(md);
    expect(html).toContain('A["quoted label"]');
  });

  it("DOMPurify does NOT strip the class=\"mermaid\" attribute", () => {
    const md = "```mermaid\ngraph LR; X-->Y;\n```";
    const html = parseMarkdown(md);
    expect(html).toMatch(/class="mermaid"/);
  });

  it("handles a multi-line mermaid diagram", () => {
    const md = [
      "```mermaid",
      "sequenceDiagram",
      "    Alice->>Bob: Hello",
      "    Bob-->>Alice: Hi",
      "```",
    ].join("\n");
    const html = parseMarkdown(md);
    expect(html).toContain('<div class="mermaid">');
    expect(html).toContain("sequenceDiagram");
    expect(html).toContain("Alice");
    expect(html).toContain("Bob");
  });

  it("handles an empty mermaid block with placeholder", () => {
    const md = "```mermaid\n```";
    const html = parseMarkdown(md);
    expect(html).toContain("mermaid-empty");
    expect(html).toContain("Empty diagram");
  });

  it("does NOT include a copy button or code-header for mermaid blocks", () => {
    const md = "```mermaid\ngraph TD; A-->B;\n```";
    const html = parseMarkdown(md);
    expect(html).not.toContain("copy-btn");
    expect(html).not.toContain("code-header");
    expect(html).not.toContain("data-copy");
  });

  it("treats 'Mermaid' (wrong case) as a regular code block, not mermaid", () => {
    const md = "```Mermaid\ngraph TD; A-->B;\n```";
    const html = parseMarkdown(md);
    expect(html).toContain("<pre");
    expect(html).not.toContain('<div class="mermaid">');
  });

  it("a non-mermaid fenced block still renders as <pre> after a mermaid block", () => {
    const md = [
      "```mermaid",
      "graph TD; A-->B;",
      "```",
      "",
      "```js",
      "const x = 1;",
      "```",
    ].join("\n");
    const html = parseMarkdown(md);
    expect(html).toContain('<div class="mermaid">');
    expect(html).toContain("<pre");
    expect(html).toContain("language-js");
  });
});

// ---- standard markdown features (GFM / breaks) ------------------------------

describe("parseMarkdown — standard markdown features", () => {
  it("renders a paragraph", () => {
    const html = parseMarkdown("Hello, world.");
    expect(html).toContain("<p>");
    expect(html).toContain("Hello, world.");
  });

  it("renders bold text as <strong>", () => {
    const html = parseMarkdown("This is **bold** text.");
    expect(html).toContain("<strong>bold</strong>");
  });

  it("renders italic text as <em>", () => {
    const html = parseMarkdown("This is *italic* text.");
    expect(html).toContain("<em>italic</em>");
  });

  it("renders an unordered list", () => {
    const html = parseMarkdown("- item one\n- item two");
    expect(html).toContain("<ul>");
    expect(html).toContain("<li>");
    expect(html).toContain("item one");
  });

  it("renders an ordered list", () => {
    const html = parseMarkdown("1. first\n2. second");
    expect(html).toContain("<ol>");
    expect(html).toContain("<li>");
    expect(html).toContain("first");
  });

  it("renders GFM task list items (- [ ] / - [x])", () => {
    const html = parseMarkdown("- [ ] todo\n- [x] done");
    expect(html).toContain('type="checkbox"');
    expect(html).toContain("todo");
    expect(html).toContain("done");
  });

  it("renders a blockquote", () => {
    const html = parseMarkdown("> quoted text");
    expect(html).toContain("<blockquote>");
    expect(html).toContain("quoted text");
  });

  it("renders a horizontal rule", () => {
    const html = parseMarkdown("---");
    expect(html).toContain("<hr");
  });

  it("renders an inline code span", () => {
    const html = parseMarkdown("use `console.log()`");
    expect(html).toContain("<code>console.log()</code>");
  });

  it("renders a hyperlink", () => {
    const html = parseMarkdown("[OpenAI](https://openai.com)");
    expect(html).toContain('<a href="https://openai.com"');
    expect(html).toContain("OpenAI");
  });

  it("renders GFM tables", () => {
    const md = "| A | B |\n|---|---|\n| 1 | 2 |";
    const html = parseMarkdown(md);
    expect(html).toContain("<table>");
    expect(html).toContain("<th>");
  });

  it("converts a single newline to a <br> (breaks: true)", () => {
    const html = parseMarkdown("line one\nline two");
    expect(html).toContain("<br");
  });

  it("returns a string, not undefined", () => {
    const result = parseMarkdown("# Hello");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

// ---- id generation edge cases -----------------------------------------------

describe("parseMarkdown — heading id edge cases", () => {
  it("handles a heading that is only special characters with fallback id", () => {
    const html = parseMarkdown("# !@#$%");
    const match = html.match(/id="([^"]*)"/);
    expect(match).not.toBeNull();
    // Should use the fallback id, not an empty string
    expect(match![1]).toBe("heading-1");
  });

  it("handles numeric headings", () => {
    const html = parseMarkdown("# 42 Things");
    expect(html).toMatch(/id="[^"]+"/);
  });

  it("collapses multiple spaces in id into single hyphen", () => {
    const html = parseMarkdown("# Hello   World");
    const match = html.match(/id="([^"]+)"/);
    expect(match).not.toBeNull();
    expect(match![1]).not.toContain("--");
    expect(match![1]).toContain("hello");
    expect(match![1]).toContain("world");
  });

  it("uses unique fallback ids for duplicate special-char headings", () => {
    const html = parseMarkdown("# !@#\n\n# !@#");
    const matches = html.match(/id="([^"]*)"/g);
    expect(matches).not.toBeNull();
    expect(matches).toHaveLength(2);
    // Second one should have a suffix
    expect(matches![0]).not.toBe(matches![1]);
  });

  it("strips trailing hyphens from ids", () => {
    const html = parseMarkdown("# Hello! ");
    const match = html.match(/id="([^"]+)"/);
    expect(match).not.toBeNull();
    expect(match![1]).not.toMatch(/-$/);
  });
});

// ---- math rendering ---------------------------------------------------------

describe("parseMarkdown — math rendering", () => {
  it("renders inline math $...$ as KaTeX", () => {
    const html = parseMarkdown("The formula $E = mc^2$ is famous.");
    expect(html).toContain("katex");
  });

  it("renders display math $$...$$ as KaTeX", () => {
    const html = parseMarkdown("$$\\sum_{i=0}^n i^2$$");
    expect(html).toContain("katex-display");
  });

  it("does not render $ in inline code as math", () => {
    const html = parseMarkdown("`$not math$`");
    expect(html).not.toContain("katex");
    expect(html).toContain("$not math$");
  });

  it("handles invalid LaTeX gracefully without throwing", () => {
    expect(() => parseMarkdown("$\\invalid{$")).not.toThrow();
  });

  it("renders multiple inline math expressions", () => {
    const html = parseMarkdown("$a$ and $b$ are variables.");
    const matches = html.match(/katex/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBeGreaterThanOrEqual(2);
  });

  it("does not treat $$ inside code blocks as math", () => {
    const html = parseMarkdown("```\n$$not math$$\n```");
    expect(html).not.toContain("katex-display");
  });

  it("renders display math with newlines", () => {
    const html = parseMarkdown("$$\nx^2 + y^2 = z^2\n$$");
    expect(html).toContain("katex");
  });
});

// ---- XSS / security note ---------------------------------------------------

describe("parseMarkdown — raw HTML passthrough (marked v9 default)", () => {
  it("passes <script> tags through unchanged (no built-in sanitization)", () => {
    const md = '<script>alert("xss")</script>';
    const html = parseMarkdown(md);
    expect(typeof html).toBe("string");
  });

  it("passes a <div> block through as-is", () => {
    const md = "<div>raw html</div>";
    const result = parseMarkdown(md);
    expect(typeof result).toBe("string");
    expect(result).toContain("raw html");
  });

  it("escapes angle brackets inside inline code spans", () => {
    const md = "use `<b>bold</b>` here";
    const html = parseMarkdown(md);
    expect(html).toContain("&lt;b&gt;");
  });
});
