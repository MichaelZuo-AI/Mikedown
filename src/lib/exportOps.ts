import { save } from "@tauri-apps/plugin-dialog";
import { readFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { useAppStore } from "@/store/appStore";

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function guessMimeType(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();

  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "svg":
      return "image/svg+xml";
    case "bmp":
      return "image/bmp";
    case "avif":
      return "image/avif";
    default:
      return "image/png";
  }
}

function unwrapMatches(root: HTMLElement, selector: string): void {
  root.querySelectorAll(selector).forEach((el) => {
    const parent = el.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(el.textContent || ""), el);
    parent.normalize();
  });
}

function getLocalImagePath(img: HTMLImageElement): string | null {
  const explicitPath = img.dataset.localPath;
  if (explicitPath) return explicitPath;

  try {
    const url = new URL(img.src);
    if (!url.hostname.endsWith("asset.localhost")) return null;
    return decodeURIComponent(url.pathname);
  } catch {
    return null;
  }
}

async function inlineLocalImages(root: HTMLElement): Promise<void> {
  const imgs = Array.from(root.querySelectorAll<HTMLImageElement>("img"));

  await Promise.all(imgs.map(async (img) => {
    const localPath = getLocalImagePath(img);
    if (!localPath) {
      img.removeAttribute("data-local-path");
      img.removeAttribute("data-original-src");
      return;
    }

    try {
      const bytes = await readFile(localPath);
      const mime = guessMimeType(img.dataset.originalSrc || localPath);
      img.src = `data:${mime};base64,${bytesToBase64(bytes)}`;
      img.removeAttribute("data-local-path");
      img.removeAttribute("data-original-src");
    } catch {
      // Keep the existing src if inlining fails.
    }
  }));
}

async function getExportContentHtml(fallbackHtml: string): Promise<string> {
  const contentEl = document.querySelector(".content") as HTMLElement | null;
  if (!contentEl) return fallbackHtml;

  const clone = contentEl.cloneNode(true) as HTMLElement;

  unwrapMatches(clone, "mark.search-highlight");
  clone.querySelectorAll("[data-copy]").forEach((button) => button.remove());

  await inlineLocalImages(clone);

  return clone.innerHTML;
}

export async function exportToHtml() {
  const store = useAppStore.getState();
  if (!store.htmlContent) return;

  const selected = await save({
    filters: [{ name: "HTML", extensions: ["html"] }],
    defaultPath: store.fileName.replace(/\.(md|markdown|txt)$/i, "") + ".html",
  });
  if (!selected) return;

  const isDark = store.theme === "dark";
  const renderedHtml = await getExportContentHtml(store.htmlContent);
  const html = `<!DOCTYPE html>
<html lang="en"${isDark ? "" : ' data-theme="light"'}>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(store.fileName)}</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 740px; margin: 0 auto; padding: 40px 20px; background: ${isDark ? "#0f0f11" : "#f8f7f4"}; color: ${isDark ? "#e8e6f0" : "#1a1825"}; }
h1, h2, h3, h4 { font-family: Georgia, serif; }
h1 { border-bottom: 1px solid ${isDark ? "#2a2a32" : "#e4e2d8"}; padding-bottom: 0.4em; }
code { font-family: 'SF Mono', monospace; font-size: 0.9em; background: ${isDark ? "#16161a" : "#f6f8fa"}; padding: 2px 6px; border-radius: 4px; }
pre { background: ${isDark ? "#16161a" : "#f6f8fa"}; padding: 16px; border-radius: 8px; overflow-x: auto; }
pre code { background: none; padding: 0; }
blockquote { border-left: 3px solid #7c6af7; padding: 12px 20px; margin: 1.2em 0; color: ${isDark ? "#7a7888" : "#6b6880"}; font-style: italic; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 8px 14px; border: 1px solid ${isDark ? "#2a2a32" : "#e4e2d8"}; }
a { color: #7c6af7; }
img { max-width: 100%; }
</style>
</head>
<body>
${renderedHtml}
</body>
</html>`;

  try {
    await writeTextFile(selected, html);
  } catch (err) {
    console.error("Export failed:", err);
    store.showToast("Failed to export file. Please try again.");
  }
}

/**
 * Export the current document as PDF via the system print dialog.
 * The user can select "Save as PDF" in the print dialog.
 * Print styles in index.css handle hiding UI chrome and formatting.
 */
export function exportToPdf() {
  const store = useAppStore.getState();
  if (!store.htmlContent) return;
  window.print();
}
