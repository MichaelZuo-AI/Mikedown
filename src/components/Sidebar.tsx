import { useAppStore } from "@/store/appStore";
import { openMarkdownFile } from "@/lib/fileOps";
import Toc from "./Toc";

export default function Sidebar() {
  const collapsed = useAppStore((s) => s.sidebarCollapsed);

  return (
    <div className={`sidebar${collapsed ? " collapsed" : ""}`}>
      <div className="sidebar-header">
        <div className="logo">M</div>
        <span className="logo-text">MD Viewer</span>
      </div>
      <button className="open-btn" onClick={openMarkdownFile}>
        <span>📂</span> Open File
      </button>
      <Toc />
    </div>
  );
}
