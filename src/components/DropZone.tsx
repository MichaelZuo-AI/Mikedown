import { useAppStore } from "@/store/appStore";
import { openMarkdownFile } from "@/lib/fileOps";

export default function DropZone() {
  const isDropZoneVisible = useAppStore((s) => s.isDropZoneVisible);
  const isDragOver = useAppStore((s) => s.isDragOver);

  const className = [
    "drop-zone",
    !isDropZoneVisible && "hidden",
    isDragOver && "dragover",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className}>
      <div className="drop-icon">📄</div>
      <div className="drop-text">Drop a Markdown file here</div>
      <div className="drop-sub">.md, .markdown, .txt</div>
      <button className="drop-open" onClick={openMarkdownFile}>
        Open File
      </button>
    </div>
  );
}
