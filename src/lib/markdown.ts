import { Marked } from "marked";
import hljs from "highlight.js/lib/core";
import DOMPurify from "dompurify";
import katex from "katex";
import markedFootnote from "marked-footnote";

// Register commonly used languages eagerly for fast first-render
import javascript from "highlight.js/lib/languages/javascript";
import typescript from "highlight.js/lib/languages/typescript";
import python from "highlight.js/lib/languages/python";
import bash from "highlight.js/lib/languages/bash";
import json from "highlight.js/lib/languages/json";
import css from "highlight.js/lib/languages/css";
import xml from "highlight.js/lib/languages/xml";
import markdown from "highlight.js/lib/languages/markdown";
import sql from "highlight.js/lib/languages/sql";
import yaml from "highlight.js/lib/languages/yaml";
import rust from "highlight.js/lib/languages/rust";
import go from "highlight.js/lib/languages/go";
import java from "highlight.js/lib/languages/java";
import cpp from "highlight.js/lib/languages/cpp";
import c from "highlight.js/lib/languages/c";
import shell from "highlight.js/lib/languages/shell";
import diff from "highlight.js/lib/languages/diff";

hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("js", javascript);
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("ts", typescript);
hljs.registerLanguage("python", python);
hljs.registerLanguage("py", python);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("json", json);
hljs.registerLanguage("css", css);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("html", xml);
hljs.registerLanguage("markdown", markdown);
hljs.registerLanguage("md", markdown);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("yaml", yaml);
hljs.registerLanguage("yml", yaml);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("rs", rust);
hljs.registerLanguage("go", go);
hljs.registerLanguage("java", java);
hljs.registerLanguage("cpp", cpp);
hljs.registerLanguage("c", c);
hljs.registerLanguage("shell", shell);
hljs.registerLanguage("sh", shell);
hljs.registerLanguage("zsh", shell);
hljs.registerLanguage("diff", diff);

const marked = new Marked();

let idCounts = new Map<string, number>();

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const renderer = {
  code(code: string, infostring: string | undefined): string {
    const lang = infostring || "";

    if (lang === "mermaid") {
      if (!code.trim()) {
        return `<div class="mermaid mermaid-empty"><span class="mermaid-placeholder">Empty diagram</span></div>`;
      }
      return `<div class="mermaid">${escapeHtml(code)}</div>`;
    }

    const validLang = lang && hljs.getLanguage(lang) ? lang : "plaintext";
    const highlighted = validLang !== "plaintext"
      ? hljs.highlight(code, { language: validLang }).value
      : escapeHtml(code);
    const langLabel = escapeHtml(lang || "text");
    return `<pre>
        <div class="code-header">
          <span class="code-lang">${langLabel}</span>
          <button class="copy-btn" data-copy>Copy</button>
        </div>
        <code class="hljs language-${validLang}">${highlighted}</code>
      </pre>`;
  },

  heading(text: string, level: number): string {
    let id = text
      .toLowerCase()
      .replace(/<[^>]*>/g, "")
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/^-+|-+$/g, "");

    // Fallback for headings that produce empty IDs (e.g., all special chars)
    if (!id) {
      id = `heading-${level}`;
    }

    const count = idCounts.get(id) || 0;
    idCounts.set(id, count + 1);
    if (count > 0) id += `-${count}`;
    return `<h${level} id="${id}">${text}</h${level}>`;
  },
};

marked.use({ renderer, breaks: true, gfm: true });
marked.use(markedFootnote());

function renderMath(content: string): string {
  // Protect code blocks and inline code from math processing
  const codeBlocks: string[] = [];
  let processed = content.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match);
    return `\x00CODEBLOCK${codeBlocks.length - 1}\x00`;
  });

  const inlineCodes: string[] = [];
  processed = processed.replace(/`[^`]+`/g, (match) => {
    inlineCodes.push(match);
    return `\x00INLINECODE${inlineCodes.length - 1}\x00`;
  });

  // Display math: $$...$$
  processed = processed.replace(/\$\$([\s\S]+?)\$\$/g, (_match, tex) => {
    try {
      return katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false });
    } catch {
      return `<span class="math-error">${escapeHtml(tex)}</span>`;
    }
  });

  // Inline math: $...$
  processed = processed.replace(/(?<!\$)\$(?!\$)([^$\n]+?)\$(?!\$)/g, (_match, tex) => {
    try {
      return katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false });
    } catch {
      return `<span class="math-error">${escapeHtml(tex)}</span>`;
    }
  });

  // Restore code blocks and inline code
  processed = processed.replace(/\x00INLINECODE(\d+)\x00/g, (_m, i) => inlineCodes[parseInt(i)]);
  processed = processed.replace(/\x00CODEBLOCK(\d+)\x00/g, (_m, i) => codeBlocks[parseInt(i)]);

  return processed;
}

export function parseMarkdown(content: string): string {
  idCounts = new Map();
  const processed = renderMath(content);
  const raw = marked.parse(processed) as string;
  const sanitized = DOMPurify.sanitize(raw, {
    ADD_ATTR: ["data-copy", "data-footnote-ref", "data-footnote-backref", "aria-describedby", "aria-label"],
    ADD_DATA_URI_TAGS: ["img"],
    ADD_TAGS: ["math", "semantics", "mrow", "mi", "mo", "mn", "msup", "msub", "mfrac", "msqrt", "mroot", "mover", "munder", "mtable", "mtr", "mtd", "mspace", "mtext", "annotation"],
  });
  // Wrap <table> elements in a scrollable container for wide tables
  return sanitized.replace(/<table>/g, '<div class="table-wrapper"><table>').replace(/<\/table>/g, '</table></div>');
}
