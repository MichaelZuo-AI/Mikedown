/**
 * Tests for src/lib/exportOps.ts
 */

import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { useAppStore } from "@/store/appStore";
import { exportToHtml } from "@/lib/exportOps";

const mockSave = save as Mock;
const mockWriteTextFile = writeTextFile as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  useAppStore.setState({
    htmlContent: "<h1>Test</h1>",
    fileName: "test.md",
    theme: "dark",
    toastMessage: "",
    toastVisible: false,
  });
});

describe("exportToHtml", () => {
  it("opens a save dialog with HTML filter", async () => {
    mockSave.mockResolvedValueOnce(null);
    await exportToHtml();
    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.arrayContaining([
          expect.objectContaining({ extensions: ["html"] }),
        ]),
      }),
    );
  });

  it("uses fileName without extension as default path", async () => {
    mockSave.mockResolvedValueOnce(null);
    await exportToHtml();
    expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultPath: "test.html",
      }),
    );
  });

  it("does nothing when no content", async () => {
    useAppStore.setState({ htmlContent: "" });
    await exportToHtml();
    expect(mockSave).not.toHaveBeenCalled();
  });

  it("does nothing when dialog is cancelled", async () => {
    mockSave.mockResolvedValueOnce(null);
    await exportToHtml();
    expect(mockWriteTextFile).not.toHaveBeenCalled();
  });

  it("writes HTML file when path is selected", async () => {
    mockSave.mockResolvedValueOnce("/path/test.html");
    mockWriteTextFile.mockResolvedValueOnce(undefined);
    await exportToHtml();
    expect(mockWriteTextFile).toHaveBeenCalledOnce();
    expect(mockWriteTextFile).toHaveBeenCalledWith(
      "/path/test.html",
      expect.stringContaining("<!DOCTYPE html"),
    );
  });

  it("exported HTML contains the original content", async () => {
    mockSave.mockResolvedValueOnce("/path/test.html");
    mockWriteTextFile.mockResolvedValueOnce(undefined);
    await exportToHtml();
    const writtenHtml = mockWriteTextFile.mock.calls[0][1] as string;
    expect(writtenHtml).toContain("<h1>Test</h1>");
  });

  it("shows toast on write error", async () => {
    mockSave.mockResolvedValueOnce("/path/test.html");
    mockWriteTextFile.mockRejectedValueOnce(new Error("disk full"));
    await exportToHtml();
    expect(useAppStore.getState().toastVisible).toBe(true);
    expect(useAppStore.getState().toastMessage).toContain("Failed");
  });
});
