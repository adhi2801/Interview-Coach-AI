// The built app ships a Content Security Policy; every page, including the
// Monaco editor (loaded from jsDelivr) and the landing page's WebGL, must
// run under it without a single violation.
import { expect, test } from "./fixtures";

async function watchViolations(page) {
  const seen = [];
  page.on("console", (m) => { if (/Content Security Policy/i.test(m.text())) seen.push(m.text()); });
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (e) => console.error(`Content Security Policy: ${e.violatedDirective} ${e.blockedURI}`));
  });
  return seen;
}

test("the landing page runs under the CSP", async ({ page, backend: _ }) => {
  const seen = await watchViolations(page);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  expect(await page.locator('meta[http-equiv="Content-Security-Policy"]').count()).toBe(1);
  expect(seen).toEqual([]);
});

test("the signed-in app, including the code editor, runs under the CSP", async ({ page, backend: _, signedIn: __ }) => {
  const seen = await watchViolations(page);
  for (const path of ["/", "/setup", "/replay", "/study-plan", "/settings"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }
  await page.goto("/coding");
  await expect(page.locator(".monaco-editor .view-lines").first()).toContainText("two_sum in Python", { timeout: 20_000 });
  await page.getByRole("button", { name: /^Run/ }).click();
  await expect(page.getByText("1 of 1 examples passed")).toBeVisible();
  expect(seen).toEqual([]);
});
