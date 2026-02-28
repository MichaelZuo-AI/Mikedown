import { Marked } from "marked";
import hljs from "highlight.js";

const marked = new Marked();

const renderer = {
  code(code: string, infostring: string | undefined): string {
    const lang = infostring || "";
    const validLang = lang && hljs.getLanguage(lang) ? lang : "plaintext";
    const highlighted = hljs.highlight(code, { language: validLang }).value;
    const langLabel = lang || "text";
    return `<pre>
        <div class="code-header">
          <span class="code-lang">${langLabel}</span>
          <button class="copy-btn" data-copy>Copy</button>
        </div>
        <code class="hljs language-${validLang}">${highlighted}</code>
      </pre>`;
  },

  heading(text: string, level: number): string {
    const id = text
      .toLowerCase()
      .replace(/<[^>]*>/g, "")
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");
    return `<h${level} id="${id}">${text}</h${level}>`;
  },
};

marked.use({ renderer, breaks: true, gfm: true });

export function parseMarkdown(content: string): string {
  return marked.parse(content) as string;
}
