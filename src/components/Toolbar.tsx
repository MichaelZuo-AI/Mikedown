import { useAppStore } from "@/store/appStore";

export default function Toolbar() {
  const fileName = useAppStore((s) => s.fileName);
  const wordCount = useAppStore((s) => s.wordCount);
  const readingTime = useAppStore((s) => s.readingTime);
  const theme = useAppStore((s) => s.theme);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const toggleTheme = useAppStore((s) => s.toggleTheme);
  const zoom = useAppStore((s) => s.zoom);

  const statsText =
    wordCount > 0
      ? `${wordCount.toLocaleString()} words \u00B7 ${readingTime} min read`
      : "";

  return (
    <div className="toolbar" data-tauri-drag-region>
      <button className="tb-btn" title="Toggle sidebar" aria-label="Toggle sidebar" onClick={toggleSidebar}>
        ☰
      </button>
      <span className="file-name">{fileName}</span>
      <span className="word-count">{statsText}</span>
      <button className="tb-btn" title="Zoom in" aria-label="Zoom in" onClick={() => zoom(1)}>
        A+
      </button>
      <button className="tb-btn" title="Zoom out" aria-label="Zoom out" onClick={() => zoom(-1)}>
        A-
      </button>
      <button className="tb-btn" title="Toggle theme" aria-label="Toggle theme" onClick={toggleTheme}>
        {theme === "dark" ? "☀" : "🌙"}
      </button>
    </div>
  );
}
