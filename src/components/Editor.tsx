import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from "@codemirror/view";
import { markdown } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { oneDark } from "@codemirror/theme-one-dark";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { useAppStore, type KeybindingMode } from "@/store/appStore";
import { clipboardToMarkdownTable } from "@/lib/tableConverter";
import { urlClickPlugin, urlHoverTooltip } from "@/lib/urlClickPlugin";

const lightTheme = EditorView.theme({
  "&": { backgroundColor: "#ffffff", color: "#1a1825" },
  ".cm-gutters": { backgroundColor: "#f8f7f4", borderRight: "1px solid #e4e2d8", color: "#a8a4b8" },
  ".cm-activeLineGutter": { backgroundColor: "#f0efe8" },
  ".cm-activeLine": { backgroundColor: "#f5f4f0" },
  "&.cm-focused .cm-cursor": { borderLeftColor: "#7c6af7" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": { backgroundColor: "#d7d4e8" },
});

async function loadKeybindingExtension(mode: KeybindingMode) {
  if (mode === "vim") {
    const { vim } = await import("@replit/codemirror-vim");
    return vim();
  }
  if (mode === "emacs") {
    const { emacs } = await import("@replit/codemirror-emacs");
    return emacs();
  }
  return [];
}

export default function Editor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const markdownContent = useAppStore((s) => s.markdownContent);
  const theme = useAppStore((s) => s.theme);
  const keybindingMode = useAppStore((s) => s.keybindingMode);
  const setMarkdownContent = useAppStore((s) => s.setMarkdownContent);

  // Create editor on mount, and recreate on theme or keybinding mode change
  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    const isDark = theme !== "light";
    const content = viewRef.current
      ? viewRef.current.state.doc.toString()
      : markdownContent;

    // Destroy previous editor if any
    viewRef.current?.destroy();
    viewRef.current = null;

    loadKeybindingExtension(keybindingMode).then((keybindingExt) => {
      if (cancelled || !containerRef.current) return;

      const state = EditorState.create({
        doc: content,
        extensions: [
          keybindingExt,
          lineNumbers(),
          highlightActiveLine(),
          drawSelection(),
          history(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          markdown({ codeLanguages: languages }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              setMarkdownContent(update.state.doc.toString());
            }
          }),
          EditorView.domEventHandlers({
            paste(event, view) {
              const clipboardData = event.clipboardData;
              if (!clipboardData) return false;
              const mdTable = clipboardToMarkdownTable(clipboardData);
              if (!mdTable) return false;
              // Replace selection (or insert at cursor) with the converted table
              const { from, to } = view.state.selection.main;
              view.dispatch({ changes: { from, to, insert: mdTable } });
              event.preventDefault();
              return true;
            },
          }),
          urlClickPlugin,
          urlHoverTooltip,
          EditorView.lineWrapping,
          isDark ? oneDark : lightTheme,
          EditorView.theme({
            "&": { height: "100%", fontSize: "14px" },
            ".cm-scroller": { fontFamily: "'JetBrains Mono', monospace", lineHeight: "1.7" },
            ".cm-content": { padding: "16px 0" },
          }),
        ],
      });

      const view = new EditorView({ state, parent: containerRef.current });
      viewRef.current = view;
    });

    return () => {
      cancelled = true;
      viewRef.current?.destroy();
      viewRef.current = null;
    };
    // Intentionally only run on mount, theme change, and keybinding mode change
    // — content syncs via updateListener
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, keybindingMode]);

  // Sync external content changes (e.g. file open) into editor
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentDoc = view.state.doc.toString();
    if (currentDoc !== markdownContent) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: markdownContent },
      });
    }
  }, [markdownContent]);

  return <div ref={containerRef} className="editor-container" />;
}
