import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { useAppStore } from "@/store/appStore";

/**
 * Opens a native file dialog and loads the selected markdown file.
 */
export async function openMarkdownFile() {
  const selected = await open({
    multiple: false,
    filters: [{ name: "Markdown", extensions: ["md", "markdown", "txt"] }],
  });
  if (!selected) return;

  const path = selected;
  const content = await readTextFile(path);
  const name = path.split("/").pop() || "Untitled";
  useAppStore.getState().loadMarkdown(content, name, path);
}

/**
 * Reads a file from a drag-and-drop file path (Tauri gives us the path directly).
 */
export async function readDroppedFile(filePath: string) {
  const content = await readTextFile(filePath);
  const name = filePath.split("/").pop() || "Untitled";
  useAppStore.getState().loadMarkdown(content, name, filePath);
}
