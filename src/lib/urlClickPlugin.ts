/**
 * CodeMirror 6 plugin for clickable URLs in the editor.
 * Cmd/Ctrl+Click opens links. URLs are underlined for visibility.
 * Inspired by unvalley/ephe's url-click extension.
 */
import {
  type EditorView,
  Decoration,
  type DecorationSet,
  ViewPlugin,
  type ViewUpdate,
  hoverTooltip,
} from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";

const MARKDOWN_LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
const URL_RE = /https?:\/\/[^\s<>"{}|\\^`[\]()]+/g;

const urlDeco = Decoration.mark({
  attributes: { style: "text-decoration: underline; text-underline-offset: 2px; cursor: pointer;" },
});

interface Range { from: number; to: number }

function matchRanges(text: string, re: RegExp): Range[] {
  return Array.from(text.matchAll(re)).flatMap((m) =>
    m.index !== undefined ? [{ from: m.index, to: m.index + m[0].length }] : [],
  );
}

function overlaps(a: Range, b: Range): boolean {
  return !(a.to <= b.from || a.from >= b.to);
}

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;
  for (let i = 1; i <= doc.lines; i++) {
    const { from: lineStart, text } = doc.line(i);
    const mdRanges = matchRanges(text, MARKDOWN_LINK_RE);
    for (const r of mdRanges) builder.add(lineStart + r.from, lineStart + r.to, urlDeco);
    const urlRanges = matchRanges(text, URL_RE).filter((r) => !mdRanges.some((md) => overlaps(r, md)));
    for (const r of urlRanges) builder.add(lineStart + r.from, lineStart + r.to, urlDeco);
  }
  return builder.finish();
}

function findUrlAtPos(view: EditorView, pos: number): string | null {
  const { from: lineFrom, text } = view.state.doc.lineAt(pos);
  const offset = pos - lineFrom;

  for (const match of text.matchAll(MARKDOWN_LINK_RE)) {
    const idx = match.index;
    if (idx !== undefined && offset >= idx && offset < idx + match[0].length) {
      return match[2]; // the URL part
    }
  }
  for (const match of text.matchAll(URL_RE)) {
    const idx = match.index;
    if (idx !== undefined && offset >= idx && offset < idx + match[0].length) {
      return match[0];
    }
  }
  return null;
}

const isMac = navigator.platform.includes("Mac");
const modLabel = isMac ? "⌘" : "Ctrl";

export const urlHoverTooltip = hoverTooltip((view, pos) => {
  const url = findUrlAtPos(view, pos);
  if (!url) return null;
  const line = view.state.doc.lineAt(pos);
  return {
    pos: line.from,
    end: line.to,
    above: true,
    create: () => {
      const dom = document.createElement("div");
      dom.style.cssText = "padding:2px 8px;font-size:12px;opacity:0.8;";
      dom.textContent = `${modLabel}+Click to open link`;
      return { dom };
    },
  };
});

export const urlClickPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) { this.decorations = buildDecorations(view); }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
    eventHandlers: {
      mousedown(event, view) {
        if (!(isMac ? event.metaKey : event.ctrlKey)) return false;
        const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
        if (pos == null) return false;
        const url = findUrlAtPos(view, pos);
        if (!url) return false;
        window.open(url, "_blank", "noopener,noreferrer");
        event.preventDefault();
        return true;
      },
    },
  },
);
