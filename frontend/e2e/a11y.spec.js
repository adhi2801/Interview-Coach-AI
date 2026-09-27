// WCAG 2 A/AA regression guard: axe must find no violations on these views.
// (The landing page is audited manually: its scroll-driven animations leave
// text mid-fade until played, which axe reports as transient contrast.)
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures";

test.use({ reducedMotion: "reduce" });

// Entrance animations fade content in; auditing mid-fade reports transient
// contrast failures. Wait until every finite animation has finished (plus a
// beat for JS-driven tweens) so only the settled page is judged.
async function settle(page) {
  await page.waitForFunction(() => document.getAnimations().every((a) => {
    const timing = a.effect?.getComputedTiming?.();
    return !timing || timing.endTime === Infinity || a.playState !== "running";
  }), null, { timeout: 10_000 });
  await page.waitForTimeout(400);
}

async function violations(page) {
  await settle(page);
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  return violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}

test("login and signup", async ({ page, backend: _ }) => {
  for (const path of ["/login", "/signup"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    expect(await violations(page), path).toEqual([]);
  }
});

test("settings, including the security tab", async ({ page, backend: _, signedIn: __ }) => {
  await page.goto("/settings");
  await page.waitForLoadState("networkidle");
  expect(await violations(page)).toEqual([]);
  await page.getByRole("button", { name: /Password & Security/ }).click();
  expect(await violations(page)).toEqual([]);
});

test("interview room", async ({ page, backend: _, signedIn: __ }) => {
  await page.goto("/setup");
  await page.getByRole("button", { name: "Start interview" }).click();
  await page.getByRole("button", { name: /Skip/ }).click();
  await expect(page.getByRole("textbox", { name: "Your answer" })).toBeVisible();
  expect(await violations(page)).toEqual([]);

  // …and the debrief after the answer is scored.
  await page.getByRole("textbox", { name: "Your answer" }).fill("A token bucket per key in Redis, refilled by elapsed time.");
  await page.getByRole("textbox", { name: "Your answer" }).press("Control+Enter");
  await expect(page.getByRole("heading", { name: "How it scored" })).toBeVisible();
  expect(await violations(page)).toEqual([]);
});

test("knowledge graph, idle and with a topic selected", async ({ page, backend: _, signedIn: __ }) => {
  await page.goto("/study-plan");
  await expect(page.getByRole("button", { name: /^Arrays,/ })).toBeVisible();
  expect(await violations(page)).toEqual([]);
  await page.getByRole("button", { name: /^Dijkstra,/ }).click();
  expect(await violations(page)).toEqual([]);
});
