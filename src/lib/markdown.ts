import { Marked } from "marked";
import hljs from "highlight.js";
import DOMPurify from "dompurify";

const marked = new Marked();

let idCounts = new Map<string, number>();

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const renderer = {
  code(code: string, infostring: string | undefined): string {
    const lang = infostring || "";
    const validLang = lang && hljs.getLanguage(lang) ? lang : "plaintext";
    const highlighted = hljs.highlight(code, { language: validLang }).value;
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
      .replace(/\s+/g, "-");
    const count = idCounts.get(id) || 0;
    idCounts.set(id, count + 1);
    if (count > 0) id += `-${count}`;
    return `<h${level} id="${id}">${text}</h${level}>`;
  },
};

marked.use({ renderer, breaks: true, gfm: true });

export function parseMarkdown(content: string): string {
  idCounts = new Map();
  const raw = marked.parse(content) as string;
  return DOMPurify.sanitize(raw, {
    ADD_ATTR: ["data-copy"],
  });
}
