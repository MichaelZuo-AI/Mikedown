import { useEffect, useCallback, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { watch } from "@tauri-apps/plugin-fs";
import { useAppStore } from "@/store/appStore";
import { openMarkdownFile, readDroppedFile, saveMarkdownFile } from "@/lib/fileOps";
import Sidebar from "@/components/Sidebar";
import Toolbar from "@/components/Toolbar";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import DropZone from "@/components/DropZone";
import ProgressBar from "@/components/ProgressBar";
import Editor from "@/components/Editor";

const ALLOWED_EXTENSIONS = ["md", "markdown", "txt"];

export default function App() {
  const theme = useAppStore((s) => s.theme);
  const editMode = useAppStore((s) => s.editMode);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const toggleEditMode = useAppStore((s) => s.toggleEditMode);
  const loadMarkdown = useAppStore((s) => s.loadMarkdown);
  const setDragOver = useAppStore((s) => s.setDragOver);
  const rafRef = useRef(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Apply theme to <html>
  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      theme === "light" ? "light" : "",
    );
  }, [theme]);

  // Tauri drag-drop listener
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    getCurrentWindow()
      .onDragDropEvent((event) => {
        const dd = event.payload;
        if (dd.type === "enter" || dd.type === "over") {
          setDragOver(true);
        } else if (dd.type === "drop") {
          setDragOver(false);
          if (dd.paths.length > 0) {
            const path = dd.paths[0];
            const ext = path.split(".").pop()?.toLowerCase();
            if (ALLOWED_EXTENSIONS.includes(ext || "")) {
              readDroppedFile(path);
            }
          }
        } else {
          setDragOver(false);
        }
      })
      .then((fn) => {
        if (cancelled) {
          fn();
        } else {
          unlisten = fn;
        }
      });

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, [setDragOver]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "o") {
        e.preventDefault();
        openMarkdownFile();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        toggleSidebar();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        saveMarkdownFile();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "e") {
        e.preventDefault();
        toggleEditMode();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleSidebar, toggleEditMode]);

  // Paste handler — skip when in edit mode (CodeMirror handles paste)
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (useAppStore.getState().editMode) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      const text = e.clipboardData?.getData("text/plain");
      if (text && text.trim().length > 0) {
        loadMarkdown(text, "Pasted");
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [loadMarkdown]);

  // File association: listen for OS file-open events + drain cold-start buffer.
  useEffect(() => {
    const unlisten = listen<string[]>("file-open", (event) => {
      if (event.payload.length > 0) {
        readDroppedFile(event.payload[0]);
      }
    });

    invoke<string[]>("get_opened_files")
      .then((paths) => {
        if (paths.length > 0) {
          readDroppedFile(paths[0]);
        }
      })
      .catch((err) => console.error("get_opened_files failed:", err));

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  // Watch current file for changes (only when NOT in edit mode to avoid overwriting edits)
  const filePath = useAppStore((s) => s.filePath);
  useEffect(() => {
    if (!filePath || editMode) return;

    let cancelled = false;
    let stopWatching: (() => void) | undefined;
    let debounceTimer: ReturnType<typeof setTimeout>;

    watch(filePath, () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        if (cancelled) return;
        try {
          const content = await readTextFile(filePath);
          const store = useAppStore.getState();
          if (store.filePath === filePath) {
            store.loadMarkdown(content, store.fileName, filePath);
          }
        } catch {
          // File may be mid-write; ignore
        }
      }, 200);
    }, { recursive: false }).then((unwatch) => {
      if (cancelled) {
        unwatch();
      } else {
        stopWatching = unwatch;
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(debounceTimer);
      stopWatching?.();
    };
  }, [filePath, editMode]);

  // Scroll progress tracking
  const onScrollProgress = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const scrollable = wrap.scrollHeight - wrap.clientHeight;
      const pct = scrollable > 0 ? (wrap.scrollTop / scrollable) * 100 : 0;
      setScrollProgress(pct);
    });
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    wrap.addEventListener("scroll", onScrollProgress);
    return () => wrap.removeEventListener("scroll", onScrollProgress);
  }, [onScrollProgress]);

  return (
    <>
      <ProgressBar progress={scrollProgress} />
      <Sidebar />
      <div className="main">
        <Toolbar />
        <div className={`content-area${editMode ? " split" : ""}`}>
          {editMode && (
            <div className="editor-pane">
              <Editor />
            </div>
          )}
          <div className="content-wrap" ref={wrapRef}>
            <DropZone />
            <MarkdownRenderer />
          </div>
        </div>
      </div>
    </>
  );
}
