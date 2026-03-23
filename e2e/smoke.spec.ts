import { test, expect } from "@playwright/test";

test("app loads and renders drop zone", async ({ page }) => {
  await page.goto("http://localhost:1420");
  await expect(page.locator(".drop-zone")).toBeVisible();
  await expect(page.locator(".drop-icon")).toBeVisible();
});

test("renders pasted markdown content", async ({ page }) => {
  await page.goto("http://localhost:1420");
  // Simulate loading markdown via store action
  await page.evaluate(() => {
    const event = new ClipboardEvent("paste", {
      clipboardData: new DataTransfer(),
    });
    Object.defineProperty(event, "clipboardData", {
      value: { getData: () => "# Hello E2E\n\nThis is a test." },
    });
    window.dispatchEvent(event);
  });
  await expect(page.locator("h1")).toContainText("Hello E2E");
});
