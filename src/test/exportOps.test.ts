/**
 * Tests for src/lib/exportOps.ts
 */

import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import { save } from "@tauri-apps/plugin-dialog";
import { readFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { useAppStore } from "@/store/appStore";
import { exportToHtml } from "@/lib/exportOps";

const mockSave = save as Mock;
const mockReadFile = readFile as Mock;
const mockWriteTextFile = writeTextFile as Mock;

beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = "";
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

  it("exports the current rendered DOM when available", async () => {
    document.body.innerHTML = `
      <div class="content">
        <div class="mermaid">
          <svg viewBox="0 0 10 10"><text>A</text></svg>
        </div>
      </div>
    `;

    useAppStore.setState({
      htmlContent: '<div class="mermaid">graph TD; A--&gt;B;</div>',
    });

    mockSave.mockResolvedValueOnce("/path/test.html");
    mockWriteTextFile.mockResolvedValueOnce(undefined);

    await exportToHtml();

    const writtenHtml = mockWriteTextFile.mock.calls[0][1] as string;
    expect(writtenHtml).toContain("<svg");
    expect(writtenHtml).not.toContain("graph TD");
  });

  it("inlines local images from the rendered DOM into the exported HTML", async () => {
    document.body.innerHTML = `
      <div class="content">
        <img
          src="http://asset.localhost/%2Ftmp%2Fphoto.png"
          data-local-path="/tmp/photo.png"
          data-original-src="photo.png"
          alt="test"
        />
      </div>
    `;

    mockReadFile.mockResolvedValueOnce(new Uint8Array([0, 1, 2]));
    mockSave.mockResolvedValueOnce("/path/test.html");
    mockWriteTextFile.mockResolvedValueOnce(undefined);

    await exportToHtml();

    const writtenHtml = mockWriteTextFile.mock.calls[0][1] as string;
    expect(writtenHtml).toContain("data:image/png;base64,AAEC");
  });

  it("shows toast on write error", async () => {
    mockSave.mockResolvedValueOnce("/path/test.html");
    mockWriteTextFile.mockRejectedValueOnce(new Error("disk full"));
    await exportToHtml();
    expect(useAppStore.getState().toastVisible).toBe(true);
    expect(useAppStore.getState().toastMessage).toContain("Failed");
  });
});
