import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { browserPath } from "./browser-path.mjs";
const base = process.argv[2] || process.env.BASE_URL || "http://127.0.0.1:5173";
const browser = await chromium.launch({
  headless: true,
  executablePath: browserPath(),
});
const failures = [];
let checks = 0;
const context = await browser.newContext({
  viewport: { width: 1440, height: 1080 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
page.setDefaultTimeout(10000);
page.on("pageerror", (error) => failures.push(error.message));
async function check(name, fn) {
  await fn();
  checks++;
  console.log(`PASS ${name}`);
}
try {
  await mkdir("test-results", { recursive: true });
  await page.goto(base);
  await page.locator(".country").first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  await check("seeded atlas and local assets load", async () => {
    await expect(page.locator("h1")).toContainText("Good cheese.");
    await expect(page.locator(".count-pill")).toHaveText("24 stops");
    assert.ok((await page.locator(".country").count()) > 100);
    await page.locator(".site-footer").scrollIntoViewIfNeeded();
    await page.waitForFunction(() =>
      [...document.images].every((img) => img.complete && img.naturalWidth > 0),
    );
    await page.screenshot({
      path: "test-results/atlas-desktop.png",
      fullPage: true,
    });
  });
  await check("interactive pins, beverage switch, and directions", async () => {
    await page
      .getByRole("button", {
        name: "Explore Cheddar, United Kingdom",
        exact: true,
      })
      .locator("circle")
      .first()
      .click();
    await expect(page.locator(".stop-card h2")).toHaveText("Cheddar");
    await page
      .getByRole("button", { name: "Pair with tea", exact: true })
      .click();
    await expect(page.locator(".pairings")).toContainText("Assam black tea");
    await expect(
      page.getByRole("link", { name: /Let’s go there/ }),
    ).toHaveAttribute("href", /Cheddar\+Gorge\+Cheese/);
  });
  await check(
    "country and search filters keep the selected card in sync",
    async () => {
      await page.getByLabel("Filter by country").selectOption("France");
      await expect(page.locator(".count-pill")).toHaveText("5 stops");
      await expect(page.locator(".location-badge")).toHaveText("France");
      await page
        .getByRole("textbox", { name: "Search cheeses or places" })
        .fill("no-such-cheese");
      await expect(page.getByText("No cheese left behind.")).toBeVisible();
      await page.getByRole("button", { name: "Show the whole atlas" }).click();
      await expect(page.locator(".count-pill")).toHaveText("24 stops");
    },
  );
  await check(
    "bookmarks survive reload and list view selects a cheese",
    async () => {
      await page
        .getByRole("button", {
          name: "Explore Cheddar, United Kingdom",
          exact: true,
        })
        .locator("circle")
        .first()
        .click();
      await page
        .getByRole("button", { name: "Save Cheddar", exact: true })
        .click();
      await page.reload();
      await page.getByRole("button", { name: "Show saved cheeses" }).click();
      await expect(page.locator(".count-pill")).toHaveText("1 stop");
      await page
        .getByRole("button", { name: "List view", exact: true })
        .click();
      await expect(page.locator(".cheese-list>button")).toHaveCount(1);
      await page.locator(".cheese-list>button").click();
      await expect(page.locator(".stop-card h2")).toHaveText("Cheddar");
      await page.getByRole("button", { name: "Show saved cheeses" }).click();
      await page.getByRole("button", { name: "Map view", exact: true }).click();
    },
  );
  await check(
    "mini-trip selection, reverse order, and transport persist",
    async () => {
      await page
        .getByRole("button", { name: "Plan a pilgrimage", exact: true })
        .click();
      const dialog = page.getByRole("dialog");
      await dialog.getByLabel("Start with a trail").selectOption("alpine");
      await dialog.getByLabel("From", { exact: true }).selectOption("1");
      await dialog.getByLabel("To", { exact: true }).selectOption("3");
      await dialog.getByLabel("Travel in reverse").check();
      await dialog.getByRole("button", { name: /Car \+ cosy stays/ }).click();
      await dialog.getByRole("button", { name: /Make this my trail/ }).click();
      assert.deepEqual(
        await page.evaluate(() =>
          JSON.parse(localStorage.getItem("pikgrim-route-v1")),
        ),
        ["reblochon", "gruyere", "emmental"],
      );
      await page.getByRole("button", { name: "Reverse trail" }).click();
      await page.reload();
      assert.deepEqual(
        await page.evaluate(() =>
          JSON.parse(localStorage.getItem("pikgrim-route-v1")),
        ),
        ["emmental", "gruyere", "reblochon"],
      );
      await page
        .getByRole("button", { name: "Plan a pilgrimage", exact: true })
        .click();
      await expect(
        page
          .getByRole("dialog")
          .getByRole("button", { name: /Car \+ cosy stays/ }),
      ).toHaveAttribute("aria-pressed", "true");
      await page.getByRole("button", { name: "Close dialog" }).click();
    },
  );
  await check("short video metadata and captions load", async () => {
    await page.goto(`${base}/#cheese=gruyere`);
    await page.getByRole("button", { name: /A little field note/ }).click();
    await page.waitForFunction(
      () => document.querySelector("video")?.readyState >= 1,
    );
    const duration = await page.locator("video").evaluate((v) => v.duration);
    assert.equal(duration, 24);
    await expect(page.locator("video track")).toHaveAttribute(
      "src",
      "/videos/sample-field-note.vtt",
    );
    await page.waitForFunction(
      () => document.querySelector("video")?.textTracks[0]?.cues?.length === 4,
    );
    await page.locator("video").evaluate((v) => v.play());
    await page.waitForFunction(
      () => document.querySelector("video")?.currentTime > 0,
    );
    await page.getByRole("button", { name: "Close dialog" }).click();
  });
  await check(
    "reviews require a rating and reject videos longer than 60 seconds",
    async () => {
      await page
        .getByRole("button", { name: "Write a review of Le Gruyère AOP" })
        .click();
      await page
        .getByLabel("Your tasting note")
        .fill("A nutty cheese with lovely sourdough.");
      await page.getByRole("button", { name: "Save to my journal" }).click();
      await expect(page.getByRole("alert")).toContainText(
        "Give this cheese a rating",
      );
      execFileSync("ffmpeg", [
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-f",
        "lavfi",
        "-i",
        "color=c=black:s=16x16:r=1",
        "-t",
        "61",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "test-results/overlong.mp4",
      ]);
      await page
        .getByLabel("Add a video", { exact: true })
        .setInputFiles("test-results/overlong.mp4");
      await expect(page.getByRole("alert")).toContainText("60 seconds or less");
      await page.getByRole("button", { name: "Rate 5 stars" }).click();
      await page.getByLabel("Your name").fill("Browser Test Pilgrim");
      await page.getByLabel("Where did you find it?").fill("My corner grocery");
      await page
        .getByLabel("Add a photograph", { exact: true })
        .setInputFiles("public/images/cheese.jpg");
      await expect(page.getByText("Photo attached")).toBeVisible();
      await page
        .getByLabel("Add a video", { exact: true })
        .setInputFiles("public/videos/sample-field-note.mp4");
      await expect(page.getByText("Video attached")).toBeVisible();
      await page.getByRole("button", { name: "Save to my journal" }).click();
      await expect(
        page.locator(".entry-author").getByText("Browser Test Pilgrim"),
      ).toBeVisible();
    },
  );
  await check(
    "personal notes and media persist separately from sample entries",
    async () => {
      await page.reload();
      await page.getByRole("button", { name: /My journal/ }).click();
      await page.getByLabel("Show sample notes").uncheck();
      await expect(page.locator(".entry-card")).toHaveCount(1);
      await expect(page.locator(".entry-body")).toContainText(
        "My corner grocery",
      );
      await expect(page.locator(".entry-photo>img")).toBeVisible();
      await page
        .locator(".entry-card")
        .getByRole("button", { name: /Watch the moment/ })
        .click();
      await page.waitForFunction(
        () => document.querySelector("video")?.readyState >= 1,
      );
      assert.equal(await page.locator("video").evaluate((v) => v.duration), 24);
      await page.getByRole("button", { name: "Close dialog" }).click();
    },
  );
  await check(
    "printable journal contains ordered pages and real QR codes",
    async () => {
      await page.getByRole("button", { name: "Make a little book" }).click();
      await expect(
        page.getByRole("button", { name: "Print / save as PDF" }),
      ).toBeEnabled();
      await expect(page.locator(".book-page")).toHaveCount(3);
      await expect(page.locator(".book-page").first().locator("h2")).toHaveText(
        "Emmentaler",
      );
      await expect(page.locator(".book-note")).toHaveCount(1);
      await expect(page.locator(".book-note img")).toBeVisible();
      await expect(page.locator(".book-page-footer img")).toHaveCount(3);
      await page.evaluate(() => {
        window.print = () => {
          window.__printReady = true;
        };
      });
      await page.getByRole("button", { name: "Print / save as PDF" }).click();
      await page.waitForFunction(() => window.__printReady === true);
      await page.waitForFunction(() =>
        [...document.querySelectorAll(".book-pages img")].every(
          (img) => img.complete && img.naturalWidth > 0,
        ),
      );
      await page.emulateMedia({ media: "print" });
      await page.pdf({
        path: "test-results/sample-journal.pdf",
        preferCSSPageSize: true,
        printBackground: true,
      });
      await page.screenshot({
        path: "test-results/print-preview.png",
        fullPage: true,
      });
      await page.emulateMedia({ media: "screen" });
      await page.getByRole("button", { name: "Close dialog" }).click();
    },
  );
  await check(
    "backup download includes personal media and excludes fictional notes",
    async () => {
      const downloadPromise = page.waitForEvent("download");
      await page.getByRole("button", { name: "Export my journal" }).click();
      const download = await downloadPromise;
      const path = await download.path();
      const backup = JSON.parse(await readFile(path, "utf8"));
      assert.equal(backup.reviews.length, 1);
      assert.match(backup.reviews[0].photo, /^data:image\/jpeg;base64,/);
      assert.match(backup.reviews[0].video, /^data:video\/mp4;base64,/);
      assert.equal(backup.version, 1);
    },
  );
  await check("sample persona has three clearly marked notes", async () => {
    await page.getByLabel("Show sample notes").check();
    await expect(page.locator(".sample-label")).toHaveCount(3);
    await expect(
      page.getByText("Margot & Jules, taking the long way."),
    ).toBeVisible();
    await page.screenshot({
      path: "test-results/journal-desktop.png",
      fullPage: true,
    });
  });
  await check(
    "mobile layout has no horizontal overflow and navigation works",
    async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole("button", { name: "Cheese Pilgrim home" }).click();
      await page.screenshot({
        path: "test-results/atlas-mobile.png",
        fullPage: true,
      });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        true,
      );
      await page.getByRole("button", { name: "Toggle navigation" }).click();
      await page
        .getByRole("button", { name: "Little pilgrimages", exact: true })
        .click();
      await expect(page.locator("h1")).toContainText("Small trips.");
      await page.getByRole("button", { name: "Plan my route" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      assert.equal(
        await page
          .getByRole("dialog")
          .evaluate((d) => d.scrollWidth <= d.clientWidth),
        true,
      );
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
    },
  );
  await check("a 320px phone has no horizontal overflow", async () => {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.getByRole("button", { name: "Cheese Pilgrim home" }).click();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await page.screenshot({
      path: "test-results/atlas-small-mobile.png",
      fullPage: true,
    });
  });
  await check("plain-HTTP previews can generate review IDs", async () => {
    await page.route("http://pikgrim.test/**", async (route) => {
      const url = route.request().url().replace("http://pikgrim.test", base);
      const response = await route.fetch({ url });
      await route.fulfill({ response });
    });
    await page.goto("http://pikgrim.test");
    await page.waitForSelector(".stop-card");
    assert.equal(await page.evaluate(() => window.isSecureContext), false);
    await page
      .getByRole("button", { name: "Write a review of Le Gruyère AOP" })
      .click();
    await page.getByRole("button", { name: "Rate 4 stars" }).click();
    await page.getByLabel("Your name").fill("Network Preview");
    await page
      .getByLabel("Your tasting note")
      .fill("A field note saved over the private network.");
    await page.getByRole("button", { name: "Save to my journal" }).click();
    await expect(
      page.locator(".entry-author").getByText("Network Preview"),
    ).toBeVisible();
  });
  await page.waitForLoadState("networkidle");
  assert.deepEqual(failures, []);
  console.log(`\n${checks} browser checks passed. No uncaught page errors.`);
} catch (error) {
  await page
    .screenshot({ path: "test-results/failure.png", fullPage: true })
    .catch(() => {});
  throw error;
} finally {
  try {
    // The HTTP compatibility proxy may still be finishing an image as teardown starts.
    await page.unrouteAll({ behavior: "ignoreErrors" });
  } finally {
    await browser.close();
  }
}
