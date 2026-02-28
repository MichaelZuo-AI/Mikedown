import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { useAppStore } from "@/store/appStore";

function extractFileName(path: string): string {
  return path.split(/[/\\]/).pop() || "Untitled";
}

/**
 * Opens a native file dialog and loads the selected markdown file.
 */
export async function openMarkdownFile() {
  try {
    const selected = await open({
      multiple: false,
      filters: [{ name: "Markdown", extensions: ["md", "markdown", "txt"] }],
    });
    if (!selected) return;

    const path = selected;
    const content = await readTextFile(path);
    const name = extractFileName(path);
    useAppStore.getState().loadMarkdown(content, name, path);
  } catch (err) {
    console.error("Failed to open file:", err);
  }
}

/**
 * Reads a file from a drag-and-drop file path (Tauri gives us the path directly).
 */
export async function readDroppedFile(filePath: string) {
  try {
    const content = await readTextFile(filePath);
    const name = extractFileName(filePath);
    useAppStore.getState().loadMarkdown(content, name, filePath);
  } catch (err) {
    console.error("Failed to read dropped file:", err);
  }
}
