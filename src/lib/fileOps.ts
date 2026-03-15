import { open, save } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
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

/**
 * Saves the current markdown content to disk.
 * If no filePath exists, opens a Save dialog first.
 */
export async function saveMarkdownFile() {
  const store = useAppStore.getState();
  let path = store.filePath;

  if (!path) {
    const selected = await save({
      filters: [{ name: "Markdown", extensions: ["md", "markdown", "txt"] }],
      defaultPath: store.fileName !== "No file opened" ? store.fileName : "untitled.md",
    });
    if (!selected) return;
    path = selected;
  }

  try {
    await writeTextFile(path, store.markdownContent);
    const name = extractFileName(path);
    useAppStore.setState({ filePath: path, fileName: name, dirty: false });
    try { localStorage.removeItem("mikedown-draft"); } catch { /* noop */ }
  } catch (err) {
    console.error("Failed to save file:", err);
    useAppStore.getState().showToast("Failed to save file. Please try again.");
  }
}
