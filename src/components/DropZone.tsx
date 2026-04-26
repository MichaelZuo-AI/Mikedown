import { useAppStore } from "@/store/appStore";
import { openMarkdownFile } from "@/lib/fileOps";

export default function DropZone() {
  const isDropZoneVisible = useAppStore((s) => s.isDropZoneVisible);
  const isDragOver = useAppStore((s) => s.isDragOver);
  const newMarkdownFile = useAppStore((s) => s.newMarkdownFile);

  const className = [
    "drop-zone",
    !isDropZoneVisible && "hidden",
    isDragOver && "dragover",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className}>
      <div className="drop-icon">MD</div>
      <div className="drop-text">Drop a Markdown file here</div>
      <div className="drop-sub">.md, .markdown, .txt</div>
      <div className="drop-actions">
        <button className="drop-open" onClick={newMarkdownFile}>
          New Markdown
        </button>
        <button className="drop-open drop-secondary" onClick={openMarkdownFile}>
          Open File
        </button>
      </div>
    </div>
  );
}
