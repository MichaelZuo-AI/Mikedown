import { create } from "zustand";
import { parseMarkdown } from "@/lib/markdown";

export type Theme = "dark" | "light";

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
}

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

  loadMarkdown: (content, name, path) => {
    const html = parseMarkdown(content);
    const words = content.trim().split(/\s+/).filter(Boolean).length;
    const readMin = Math.ceil(words / 200);
    set({
      markdownContent: content,
      htmlContent: html,
      fileName: name || "Untitled",
      filePath: path || "",
      wordCount: words,
      readingTime: readMin,
      isDropZoneVisible: false,
      dirty: false,
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
  },

  markClean: () => set({ dirty: false }),
}));
