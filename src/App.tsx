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
import SearchBar from "@/components/SearchBar";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import DropZone from "@/components/DropZone";
import ProgressBar from "@/components/ProgressBar";
import Editor from "@/components/Editor";
import TabBar from "@/components/TabBar";
import Toast from "@/components/Toast";

const ALLOWED_EXTENSIONS = ["md", "markdown", "txt"];

export default function App() {
  const theme = useAppStore((s) => s.theme);
  const editMode = useAppStore((s) => s.editMode);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const toggleEditMode = useAppStore((s) => s.toggleEditMode);
  const toggleSearch = useAppStore((s) => s.toggleSearch);
  const loadMarkdown = useAppStore((s) => s.loadMarkdown);
  const setDragOver = useAppStore((s) => s.setDragOver);
  const newTab = useAppStore((s) => s.newTab);
  const closeTab = useAppStore((s) => s.closeTab);
  const zoom = useAppStore((s) => s.zoom);
  const activeTabId = useAppStore((s) => s.activeTabId);
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

  // Restore session or draft on mount (only if no file was opened via CLI/association)
  useEffect(() => {
    const store = useAppStore.getState();
    if (!store.filePath && !store.markdownContent) {
      store.restoreSession().catch(() => {
        // Session restore failed (e.g. not in Tauri) — fall back to draft
        store.restoreDraft();
      });
    }
  }, []);

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
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        toggleSearch();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "t") {
        e.preventDefault();
        newTab();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "w") {
        e.preventDefault();
        closeTab(useAppStore.getState().activeTabId);
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        zoom(1);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "-") {
        e.preventDefault();
        zoom(-1);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "0") {
        e.preventDefault();
        useAppStore.setState({ fontSize: 100 });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleSidebar, toggleEditMode, toggleSearch, newTab, closeTab, zoom]);

  // Trackpad pinch-to-zoom (macOS sends wheel events with ctrlKey for pinch gestures)
  useEffect(() => {
    let lastZoomTime = 0;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const now = Date.now();
      if (now - lastZoomTime < 150) return; // Throttle rapid pinch events
      lastZoomTime = now;
      zoom(e.deltaY < 0 ? 1 : -1);
    };
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [zoom]);

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

  // Watch current file for external changes.
  // We watch the *parent directory* instead of the file itself because on macOS
  // the kqueue backend loses track of the file when editors do atomic saves
  // (write-to-temp + rename), which replaces the inode the watcher was tracking.
  const filePath = useAppStore((s) => s.filePath);
  useEffect(() => {
    if (!filePath || editMode) return;

    const dir = filePath.replace(/[/\\][^/\\]*$/, "");
    const basename = filePath.split(/[/\\]/).pop() || "";
    if (!dir || !basename) return;

    let cancelled = false;
    let stopWatching: (() => void) | undefined;
    let debounceTimer: ReturnType<typeof setTimeout>;
    let lastContent: string | undefined;

    watch(dir, (event: unknown) => {
      // Filter: only react when our specific file is affected
      const paths: string[] = ((event as Record<string, unknown>)?.paths as string[]) ?? [];
      const relevant = paths.length === 0 || paths.some((p) => {
        const name = (typeof p === "string" ? p : "").split(/[/\\]/).pop();
        return name === basename;
      });
      if (!relevant) return;

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        if (cancelled) return;
        try {
          const content = await readTextFile(filePath);
          // Skip if content hasn't actually changed (avoids render loops)
          if (content === lastContent) return;
          lastContent = content;
          const store = useAppStore.getState();
          if (store.filePath === filePath && store.markdownContent !== content) {
            store.loadMarkdown(content, store.fileName, filePath);
          }
        } catch {
          // File may be mid-write; ignore
        }
      }, 300);
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

  // Save scroll position on scroll, restore on tab switch
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const onScroll = () => {
      useAppStore.getState().saveScrollTop(wrap.scrollTop);
    };
    wrap.addEventListener("scroll", onScroll);
    return () => wrap.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const tab = useAppStore.getState().tabs.find((t) => t.id === activeTabId);
    if (tab) {
      requestAnimationFrame(() => {
        wrap.scrollTop = tab.scrollTop;
      });
    }
  }, [activeTabId]);

  return (
    <>
      <ProgressBar progress={scrollProgress} />
      <Sidebar />
      <div className="main">
        <Toolbar />
        <TabBar />
        <SearchBar />
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
      <Toast />
    </>
  );
}
