import { useAppStore } from "@/store/appStore";
import { openMarkdownFile } from "@/lib/fileOps";
import Toc from "./Toc";
import RecentFiles from "./RecentFiles";

export default function Sidebar() {
  const collapsed = useAppStore((s) => s.sidebarCollapsed);

  return (
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
    </div>
  );
}
