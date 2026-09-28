import { chromium } from "@playwright/test";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
export function browserPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  if (existsSync(chromium.executablePath())) return chromium.executablePath();
  const cache = join(homedir(), "Library/Caches/ms-playwright");
  if (existsSync(cache))
    for (const directory of readdirSync(cache)
      .filter((name) => name.startsWith("chromium_headless_shell-"))
      .sort()
      .reverse()) {
      const path = join(
        cache,
        directory,
        "chrome-headless-shell-mac-arm64/chrome-headless-shell",
      );
      if (existsSync(path)) return path;
    }
  return undefined;
}
