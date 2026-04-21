import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { saveMarkdownFile } from "@/lib/fileOps";
import { useAppStore } from "@/store/appStore";

const mockSave = save as Mock;
const mockWriteTextFile = writeTextFile as Mock;

function resetStore() {
  useAppStore.setState({
    tabs: [{ id: "save-test-tab-1", markdownContent: "", htmlContent: "", fileName: "No file opened", filePath: "", wordCount: 0, readingTime: 0, dirty: false, scrollTop: 0 }],
    activeTabId: "save-test-tab-1",
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
    theme: "dark" as const,
    fontSize: 100,
    searchOpen: false,
    keybindingMode: "default" as const,
    toastMessage: "",
    toastVisible: false,
    recentFiles: [],
  });
  try { localStorage.clear(); } catch { /* noop */ }
}

function get() {
  return useAppStore.getState();
}

describe("saveMarkdownFile", () => {
  beforeEach(() => {
    resetStore();
    vi.clearAllMocks();
  });

  it("updates the saved tab entry during save-as in a multi-tab session", async () => {
    get().loadMarkdown("# First", "first.md", "/docs/first.md");
    const firstId = get().activeTabId;

    get().newTab();
    const draftTabId = get().activeTabId;
    get().setMarkdownContent("# Draft");

    mockSave.mockResolvedValueOnce("/docs/draft.md");
    mockWriteTextFile.mockResolvedValueOnce(undefined);

    await saveMarkdownFile();

    const firstTab = get().tabs.find((t) => t.id === firstId)!;
    const draftTab = get().tabs.find((t) => t.id === draftTabId)!;

    expect(mockWriteTextFile).toHaveBeenCalledWith("/docs/draft.md", "# Draft");
    expect(firstTab.filePath).toBe("/docs/first.md");
    expect(draftTab.filePath).toBe("/docs/draft.md");
    expect(draftTab.fileName).toBe("draft.md");
    expect(draftTab.dirty).toBe(false);

    get().setActiveTab(firstId);
    get().setActiveTab(draftTabId);
    expect(get().fileName).toBe("draft.md");
    expect(get().filePath).toBe("/docs/draft.md");
  });
});
