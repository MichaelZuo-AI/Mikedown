import { useAppStore } from "@/store/appStore";
import { readDroppedFile } from "@/lib/fileOps";

export default function RecentFiles() {
  const recentFiles = useAppStore((s) => s.recentFiles);
  const clearRecentFiles = useAppStore((s) => s.clearRecentFiles);

  if (recentFiles.length === 0) return null;

  return (
    <div className="recent-files">
      <div className="recent-header">
        <span className="toc-title">Recent</span>
        <button className="recent-clear" onClick={clearRecentFiles} title="Clear recent files" aria-label="Clear recent files">
          Clear
        </button>
      </div>
      {recentFiles.map((f) => (
        <button
          key={f.path}
          className="recent-item"
          onClick={() => readDroppedFile(f.path)}
          title={f.path}
        >
          {f.name}
        </button>
      ))}
    </div>
  );
}
