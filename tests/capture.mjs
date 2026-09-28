import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { browserPath } from "./browser-path.mjs";
const browser = await chromium.launch({
  headless: true,
  executablePath: browserPath(),
});
try {
  await mkdir("test-results", { recursive: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1080 },
    deviceScaleFactor: 1,
  });
  page.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));
  await page.goto(process.argv[2] || process.env.BASE_URL || "http://127.0.0.1:5173");
  await page.locator(".country").first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: "test-results/atlas-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "My journal", exact: true }).click();
  await page.screenshot({
    path: "test-results/journal-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Cheese Pilgrim home" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/atlas-mobile.png",
    fullPage: true,
  });
  console.log("Captured desktop atlas, desktop journal, and mobile atlas.");
} finally {
  await browser.close();
}
