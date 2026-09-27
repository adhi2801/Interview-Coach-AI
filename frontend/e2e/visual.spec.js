// Full-page screenshots of every screen for design review. Opt-in:
//   SHOTS=<dir> npx playwright test e2e/visual.spec.js
// Not a regression test (no baselines); it just renders each page with a
// realistic history so a person can look at it.

import { expect, test } from "./fixtures";

const DIR = process.env.SHOTS;
test.skip(!DIR, "set SHOTS=<output dir> to capture screenshots");
test.use({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });

async function shot(page, name, { full = true } = {}) {
  await page.waitForLoadState("networkidle");
  if (full) {
    // Scroll-triggered sections only render in view, and the page smooth-
    // scrolls, so instead make the viewport as tall as the page: everything
    // is in view at once. Restored after the capture.
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ width: 1440, height: Math.min(height, 12000) });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${DIR}/${name}.png`, fullPage: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    return;
  }
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${DIR}/${name}.png`, fullPage: full });
}

test.describe("signed out", () => {
  test("auth", async ({ page, backend: _ }) => {
    await page.goto("/login");
    await shot(page, "auth-login", { full: false });
    await page.goto("/signup");
    await shot(page, "auth-signup", { full: false });
  });
});

test.describe("new account", () => {
  test("overview, empty", async ({ page, backend: _, signedIn: __ }) => {
    await page.goto("/");
    await shot(page, "overview-empty");
  });
});

test.describe("three weeks in", () => {
  test.use({ history: "rich" });

  test("app pages", async ({ page, backend: _, signedIn: __ }) => {
    for (const [path, name] of [
      ["/", "overview"], ["/setup", "setup"], ["/replay", "sessions"], ["/replay/9", "replay"],
      ["/settings", "settings"], ["/coding", "coding"], ["/study-plan", "knowledge"],
    ]) {
      await page.goto(path);
      await shot(page, name, { full: !["/coding"].includes(path) });
    }
  });

  test("interview and debrief", async ({ page, backend: _, signedIn: __ }) => {
    await page.goto("/setup");
    await page.getByRole("button", { name: "Start interview" }).click();
    await shot(page, "preflight", { full: false });
    await page.getByRole("button", { name: /Skip/ }).click();
    await page.getByRole("textbox", { name: "Your answer" })
      .fill("I'd use a token bucket per API key in Redis, refilled by elapsed time in a Lua script. Um, over the limit returns 429.");
    await shot(page, "interview", { full: false });
    await page.getByRole("textbox", { name: "Your answer" }).press("Control+Enter");
    await expect(page.getByText("Retry this question")).toBeVisible();
    await shot(page, "debrief");
  });
});
