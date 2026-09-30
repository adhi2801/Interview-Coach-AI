// Every page at phone width: nothing may scroll sideways, and the page's
// main heading must be on screen.
import { expect, test } from "./fixtures";

test.use({ viewport: { width: 390, height: 844 }, history: "rich" });

const overflow = (page) => page.evaluate(() => {
  const wide = [...document.querySelectorAll("body *")].filter((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.right > window.innerWidth + 1 && getComputedStyle(el).position !== "fixed";
  });
  return { scroll: document.documentElement.scrollWidth, sample: wide.slice(0, 3).map((el) => `${el.tagName}.${String(el.className).slice(0, 60)}`) };
});

for (const [path, heading] of [
  ["/", /Good (morning|afternoon|evening|night), Ada/],
  ["/setup", "Set up an interview"],
  ["/replay", "Sessions"],
  ["/replay/9", /Google/],
  ["/study-plan", /gaps? (is|are) holding back|topics/],
  ["/settings", "Settings"],
]) {
  test(`${path} fits a phone`, async ({ page, backend: _, signedIn: __ }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 }).first()).toContainText(heading);
    const { scroll, sample } = await overflow(page);
    expect(scroll, `wider than the screen: ${sample.join(", ")}`).toBeLessThanOrEqual(390);
  });
}

for (const path of ["/login", "/signup", "/forgot-password", "/about", "/"]) {
  test(`signed out ${path} fits a phone`, async ({ page, backend: _ }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const { scroll, sample } = await overflow(page);
    expect(scroll, `wider than the screen: ${sample.join(", ")}`).toBeLessThanOrEqual(390);
  });
}

test("the sessions list shows scores on a phone without scrolling sideways", async ({ page, backend: _, signedIn: __ }) => {
  await page.goto("/replay");
  const firstRow = page.getByRole("row").nth(1);
  await expect(firstRow).toContainText("7.8");
  const box = await firstRow.getByText("7.8").boundingBox();
  expect(box.x + box.width).toBeLessThanOrEqual(390);
});
