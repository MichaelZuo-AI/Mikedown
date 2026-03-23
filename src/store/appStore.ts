import { create } from "zustand";
import { parseMarkdown } from "@/lib/markdown";

export type Theme = "dark" | "light";
export type KeybindingMode = "default" | "vim" | "emacs";

export interface RecentFile {
  name: string;
  path: string;
}

export interface Tab {
  id: string;
  markdownContent: string;
  htmlContent: string;
  fileName: string;
  filePath: string;
  wordCount: number;
  readingTime: number;
  dirty: boolean;
}

interface AppState {
  // Multi-tab
  tabs: Tab[];
  activeTabId: string;

  // Editor
  editMode: boolean;

  // UI
  sidebarCollapsed: boolean;
  isDragOver: boolean;
  isDropZoneVisible: boolean;
  theme: Theme;
  fontSize: number; // percentage 70-140
  searchOpen: boolean;

  // Editor keybindings
  keybindingMode: KeybindingMode;

  // Toast
  toastMessage: string;
  toastVisible: boolean;

  // Recent files
  recentFiles: RecentFile[];

  // Computed getters for active tab
  markdownContent: string;
  htmlContent: string;
  fileName: string;
  filePath: string;
  wordCount: number;
  readingTime: number;
  dirty: boolean;

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
  setKeybindingMode: (mode: KeybindingMode) => void;
  cycleKeybindingMode: () => void;
  addRecentFile: (name: string, path: string) => void;
  clearRecentFiles: () => void;
  restoreDraft: () => void;
  clearDraft: () => void;

  // Tab actions
  newTab: () => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
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
let parseTimer: ReturnType<typeof setTimeout> | undefined;

let nextTabId = 1;
function genTabId(): string {
  return `tab-${nextTabId++}`;
}

function createEmptyTab(): Tab {
  return {
    id: genTabId(),
    markdownContent: "",
    htmlContent: "",
    fileName: "No file opened",
    filePath: "",
    wordCount: 0,
    readingTime: 0,
    dirty: false,
  };
}

function getActiveTab(state: { tabs: Tab[]; activeTabId: string }): Tab {
  return state.tabs.find((t) => t.id === state.activeTabId) || state.tabs[0];
}

function updateActiveTab(
  state: { tabs: Tab[]; activeTabId: string },
  updates: Partial<Tab>,
): Tab[] {
  return state.tabs.map((t) =>
    t.id === state.activeTabId ? { ...t, ...updates } : t,
  );
}

function deriveFromActiveTab(tabs: Tab[], activeTabId: string) {
  const tab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  return {
    tabs,
    markdownContent: tab.markdownContent,
    htmlContent: tab.htmlContent,
    fileName: tab.fileName,
    filePath: tab.filePath,
    wordCount: tab.wordCount,
    readingTime: tab.readingTime,
    dirty: tab.dirty,
  };
}

const initialTab = createEmptyTab();

export const useAppStore = create<AppState>((set) => ({
  tabs: [initialTab],
  activeTabId: initialTab.id,

  // Derived fields from active tab
  markdownContent: "",
  htmlContent: "",
  fileName: "No file opened",
  filePath: "",
  wordCount: 0,
  readingTime: 0,
  dirty: false,

  editMode: false,

  sidebarCollapsed: false,
  isDragOver: false,
  isDropZoneVisible: true,
  theme: "dark",
  fontSize: 100,
  searchOpen: false,

  keybindingMode: (safeGetItem("mikedown-keybinding") as KeybindingMode) || "default",

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

    set((s) => {
      // Check if the file is already open in another tab
      if (path) {
        const existingTab = s.tabs.find((t) => t.filePath === path);
        if (existingTab) {
          // Switch to existing tab and refresh content
          const tabs = s.tabs.map((t) =>
            t.id === existingTab.id
              ? { ...t, markdownContent: content, htmlContent: html, fileName: finalName, filePath: path, wordCount: words, readingTime: readMin, dirty: false }
              : t,
          );
          return {
            ...deriveFromActiveTab(tabs, existingTab.id),
            activeTabId: existingTab.id,
            isDropZoneVisible: false,
            ...(recentFiles ? { recentFiles } : {}),
          };
        }
      }

      // Load into active tab if it's empty/untouched, otherwise open a new tab
      const active = getActiveTab(s);
      const isUntouched = !active.markdownContent && !active.filePath && !active.dirty;

      if (isUntouched) {
        const tabs = updateActiveTab(s, {
          markdownContent: content,
          htmlContent: html,
          fileName: finalName,
          filePath: path || "",
          wordCount: words,
          readingTime: readMin,
          dirty: false,
        });
        return {
          ...deriveFromActiveTab(tabs, s.activeTabId),
          isDropZoneVisible: false,
          ...(recentFiles ? { recentFiles } : {}),
        };
      }

      // Open in a new tab
      const newTab: Tab = {
        id: genTabId(),
        markdownContent: content,
        htmlContent: html,
        fileName: finalName,
        filePath: path || "",
        wordCount: words,
        readingTime: readMin,
        dirty: false,
      };
      const tabs = [...s.tabs, newTab];
      return {
        ...deriveFromActiveTab(tabs, newTab.id),
        activeTabId: newTab.id,
        isDropZoneVisible: false,
        ...(recentFiles ? { recentFiles } : {}),
      };
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
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    const readMin = Math.ceil(words / 200);

    // Immediate: update raw content and stats (keeps editor responsive)
    set((s) => {
      const tabs = updateActiveTab(s, {
        markdownContent: content,
        wordCount: words,
        readingTime: readMin,
        dirty: true,
      });
      return deriveFromActiveTab(tabs, s.activeTabId);
    });

    // Debounced: re-parse markdown (expensive for large files)
    clearTimeout(parseTimer);
    parseTimer = setTimeout(() => {
      const html = parseMarkdown(content);
      set((s) => {
        const tabs = updateActiveTab(s, { htmlContent: html });
        return deriveFromActiveTab(tabs, s.activeTabId);
      });
    }, 150);

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
    set((s) => {
      const tabs = updateActiveTab(s, { dirty: false });
      return { ...deriveFromActiveTab(tabs, s.activeTabId) };
    });
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

  setKeybindingMode: (mode) => {
    safeSetItem("mikedown-keybinding", mode);
    set({ keybindingMode: mode });
  },
  cycleKeybindingMode: () =>
    set((s) => {
      const modes: KeybindingMode[] = ["default", "vim", "emacs"];
      const next = modes[(modes.indexOf(s.keybindingMode) + 1) % modes.length];
      safeSetItem("mikedown-keybinding", next);
      return { keybindingMode: next };
    }),

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
      set((s) => {
        const tabs = updateActiveTab(s, {
          markdownContent: content,
          htmlContent: html,
          fileName: fileName || "Draft",
          filePath: filePath || "",
          wordCount: words,
          readingTime: readMin,
          dirty: true,
        });
        return {
          ...deriveFromActiveTab(tabs, s.activeTabId),
          isDropZoneVisible: false,
        };
      });
    } catch {
      safeRemoveItem("mikedown-draft");
    }
  },

  clearDraft: () => {
    safeRemoveItem("mikedown-draft");
  },

  // -- Tab management --

  newTab: () =>
    set((s) => {
      const tab = createEmptyTab();
      const tabs = [...s.tabs, tab];
      return {
        ...deriveFromActiveTab(tabs, tab.id),
        activeTabId: tab.id,
        isDropZoneVisible: true,
      };
    }),

  closeTab: (id) =>
    set((s) => {
      if (s.tabs.length <= 1) {
        // Last tab — reset to empty instead of removing
        const tab = createEmptyTab();
        const newTabs = [tab];
        return {
          activeTabId: tab.id,
          ...deriveFromActiveTab(newTabs, tab.id),
          isDropZoneVisible: true,
        };
      }
      const idx = s.tabs.findIndex((t) => t.id === id);
      const tabs = s.tabs.filter((t) => t.id !== id);
      const newActiveId =
        s.activeTabId === id
          ? tabs[Math.min(idx, tabs.length - 1)].id
          : s.activeTabId;
      return {
        ...deriveFromActiveTab(tabs, newActiveId),
        activeTabId: newActiveId,
        isDropZoneVisible: !tabs.find((t) => t.id === newActiveId)?.markdownContent,
      };
    }),

  setActiveTab: (id) =>
    set((s) => {
      const tab = s.tabs.find((t) => t.id === id);
      if (!tab) return {};
      return {
        activeTabId: id,
        ...deriveFromActiveTab(s.tabs, id),
        isDropZoneVisible: !tab.markdownContent,
      };
    }),
}));
