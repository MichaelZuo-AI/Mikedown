import { useAppStore } from "@/store/appStore";
import { openMarkdownFile } from "@/lib/fileOps";
import Toc from "./Toc";
import RecentFiles from "./RecentFiles";

export default function Sidebar() {
  const collapsed = useAppStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);

  return (
    <>
      <div className={`sidebar${collapsed ? " collapsed" : ""}`}>
        <div className="sidebar-header">
          <div className="logo">M</div>
          <span className="logo-text">MikeDown</span>
        </div>
        <button className="open-btn" onClick={openMarkdownFile}>
          <span>&#x1F4C2;</span> Open File
        </button>
        <RecentFiles />
        <Toc />
        <button
          className="sidebar-collapse-btn"
          onClick={toggleSidebar}
          title="Hide sidebar"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <line x1="5.5" y1="1" x2="5.5" y2="15" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10 6L8 8L10 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      {collapsed && (
        <button
          className="sidebar-expand-btn"
          onClick={toggleSidebar}
          title="Show sidebar"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <line x1="5.5" y1="1" x2="5.5" y2="15" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 6L10 8L8 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </>
  );
}
