import { useEffect, useCallback, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useAppStore } from "@/store/appStore";
import { openMarkdownFile, readDroppedFile } from "@/lib/fileOps";
import Sidebar from "@/components/Sidebar";
import Toolbar from "@/components/Toolbar";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import DropZone from "@/components/DropZone";
import ProgressBar from "@/components/ProgressBar";

export default function App() {
  const theme = useAppStore((s) => s.theme);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
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

    getCurrentWindow()
      .onDragDropEvent((event) => {
        const dd = event.payload;
        if (dd.type === "enter" || dd.type === "over") {
          setDragOver(true);
        } else if (dd.type === "drop") {
          setDragOver(false);
          if (dd.paths.length > 0) {
            readDroppedFile(dd.paths[0]);
          }
        } else {
          setDragOver(false);
        }
      })
      .then((fn) => {
        unlisten = fn;
      });

    return () => unlisten?.();
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
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [toggleSidebar]);

  // Paste handler
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData("text/plain");
      if (text && text.trim().startsWith("#")) {
        loadMarkdown(text, "Pasted");
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [loadMarkdown]);

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
        <div className="content-wrap" ref={wrapRef}>
          <DropZone />
          <MarkdownRenderer />
        </div>
      </div>
    </>
  );
}
