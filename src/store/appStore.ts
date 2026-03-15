import { create } from "zustand";
import { parseMarkdown } from "@/lib/markdown";

export type Theme = "dark" | "light";

interface RecentFile {
  name: string;
  path: string;
}

interface AppState {
  // Content
  markdownContent: string;
  htmlContent: string;
  fileName: string;
  filePath: string;
  wordCount: number;
  readingTime: number;

  // Editor
  editMode: boolean;
  dirty: boolean;

  // UI
  sidebarCollapsed: boolean;
  isDragOver: boolean;
  isDropZoneVisible: boolean;
  theme: Theme;
  fontSize: number; // percentage 70-140
  searchOpen: boolean;

  // Toast
  toastMessage: string;
  toastVisible: boolean;

  // Recent files
  recentFiles: RecentFile[];

  // Actions
  loadMarkdown: (content: string, name: string, path?: string) => void;
  toggleSidebar: () => void;
  setDragOver: (v: boolean) => void;
  showDropZone: () => void;
  hideDropZone: () => void;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  zoom: (dir: 1 | -1) => void;
  toggleEditMode: () => void;
  setMarkdownContent: (content: string) => void;
  markClean: () => void;
  toggleSearch: () => void;
  setSearchOpen: (v: boolean) => void;
  showToast: (message: string) => void;
  dismissToast: () => void;
  addRecentFile: (name: string, path: string) => void;
  clearRecentFiles: () => void;
  restoreDraft: () => void;
  clearDraft: () => void;
}

function safeGetItem(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}

function safeSetItem(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* noop */ }
}

function safeRemoveItem(key: string): void {
  try { localStorage.removeItem(key); } catch { /* noop */ }
}

function loadRecentFiles(): RecentFile[] {
  try {
    return JSON.parse(safeGetItem("mikedown-recent-files") || "[]");
  } catch {
    return [];
  }
}

let autoSaveTimer: ReturnType<typeof setTimeout> | undefined;

export const useAppStore = create<AppState>((set) => ({
  markdownContent: "",
  htmlContent: "",
  fileName: "No file opened",
  filePath: "",
  wordCount: 0,
  readingTime: 0,

  editMode: false,
  dirty: false,

  sidebarCollapsed: false,
  isDragOver: false,
  isDropZoneVisible: true,
  theme: "dark",
  fontSize: 100,
  searchOpen: false,

  toastMessage: "",
  toastVisible: false,

  recentFiles: loadRecentFiles(),

  loadMarkdown: (content, name, path) => {
    const html = parseMarkdown(content);
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    const readMin = Math.ceil(words / 200);
    const finalName = name || "Untitled";

    // Update recent files
    let recentFiles: RecentFile[] | undefined;
    if (path) {
      const current = loadRecentFiles();
      const filtered = current.filter((f) => f.path !== path);
      recentFiles = [{ name: finalName, path }, ...filtered].slice(0, 10);
      safeSetItem("mikedown-recent-files", JSON.stringify(recentFiles));
    }

    set({
      markdownContent: content,
      htmlContent: html,
      fileName: finalName,
      filePath: path || "",
      wordCount: words,
      readingTime: readMin,
      isDropZoneVisible: false,
      dirty: false,
      ...(recentFiles ? { recentFiles } : {}),
    });
  },

  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setDragOver: (v) => set({ isDragOver: v }),
  showDropZone: () => set({ isDropZoneVisible: true }),
  hideDropZone: () => set({ isDropZoneVisible: false }),
  setTheme: (t) => set({ theme: t }),
  toggleTheme: () =>
    set((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
  zoom: (dir) =>
    set((s) => ({ fontSize: Math.max(70, Math.min(140, s.fontSize + dir * 10)) })),

  toggleEditMode: () => set((s) => ({ editMode: !s.editMode })),

  setMarkdownContent: (content) => {
    const html = parseMarkdown(content);
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    const readMin = Math.ceil(words / 200);
    set({
      markdownContent: content,
      htmlContent: html,
      wordCount: words,
      readingTime: readMin,
      dirty: true,
    });
    // Debounced auto-save to localStorage
    clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      const s = useAppStore.getState();
      safeSetItem("mikedown-draft", JSON.stringify({
        content,
        fileName: s.fileName,
        filePath: s.filePath,
        timestamp: Date.now(),
      }));
    }, 1000);
  },

  markClean: () => {
    set({ dirty: false });
    safeRemoveItem("mikedown-draft");
  },

  toggleSearch: () => set((s) => ({ searchOpen: !s.searchOpen })),
  setSearchOpen: (v) => set({ searchOpen: v }),

  showToast: (message) => {
    set({ toastMessage: message, toastVisible: true });
    setTimeout(() => {
      set({ toastVisible: false });
    }, 4000);
  },
  dismissToast: () => set({ toastVisible: false }),

  addRecentFile: (name, path) => {
    if (!path) return;
    set((s) => {
      const filtered = s.recentFiles.filter((f) => f.path !== path);
      const updated = [{ name, path }, ...filtered].slice(0, 10);
      safeSetItem("mikedown-recent-files", JSON.stringify(updated));
      return { recentFiles: updated };
    });
  },

  clearRecentFiles: () => {
    safeRemoveItem("mikedown-recent-files");
    set({ recentFiles: [] });
  },

  restoreDraft: () => {
    const draft = safeGetItem("mikedown-draft");
    if (!draft) return;
    try {
      const { content, fileName, filePath, timestamp } = JSON.parse(draft);
      if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
        safeRemoveItem("mikedown-draft");
        return;
      }
      const html = parseMarkdown(content);
      const words = content.trim().split(/\s+/).filter(Boolean).length;
      const readMin = Math.ceil(words / 200);
      set({
        markdownContent: content,
        htmlContent: html,
        fileName: fileName || "Draft",
        filePath: filePath || "",
        wordCount: words,
        readingTime: readMin,
        isDropZoneVisible: false,
        dirty: true,
      });
    } catch {
      safeRemoveItem("mikedown-draft");
    }
  },

  clearDraft: () => {
    safeRemoveItem("mikedown-draft");
  },
}));
