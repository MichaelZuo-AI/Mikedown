import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine, drawSelection } from "@codemirror/view";
import { markdown } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { oneDark } from "@codemirror/theme-one-dark";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { useAppStore } from "@/store/appStore";

const lightTheme = EditorView.theme({
  "&": { backgroundColor: "#ffffff", color: "#1a1825" },
  ".cm-gutters": { backgroundColor: "#f8f7f4", borderRight: "1px solid #e4e2d8", color: "#a8a4b8" },
  ".cm-activeLineGutter": { backgroundColor: "#f0efe8" },
  ".cm-activeLine": { backgroundColor: "#f5f4f0" },
  "&.cm-focused .cm-cursor": { borderLeftColor: "#7c6af7" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": { backgroundColor: "#d7d4e8" },
});

export default function Editor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const markdownContent = useAppStore((s) => s.markdownContent);
  const theme = useAppStore((s) => s.theme);
  const setMarkdownContent = useAppStore((s) => s.setMarkdownContent);

  // Create editor on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const isDark = theme !== "light";
    const state = EditorState.create({
      doc: markdownContent,
      extensions: [
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

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Intentionally only run on mount and theme change — content syncs via updateListener
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

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
