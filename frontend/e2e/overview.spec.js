import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures";

test.describe("overview, three weeks in", () => {
  test.use({ history: "rich", reducedMotion: "reduce" });

  test.beforeEach(async ({ page, backend: _, signedIn: __ }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Work on next" })).toBeVisible();
  });

  test("summarises real progress and leads with the actions", async ({ page }) => {
    await expect(page.getByText(/Your rating is [\d,]+, up \d+ in the last 30 days\. Recursion is the gap to fix first\./)).toBeVisible();
    await expect(page.getByRole("button", { name: "Start an interview" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Solve a coding problem" })).toBeVisible();
    // Defaults to the company practised most in the history (Google).
    await expect(page.getByRole("combobox")).toHaveValue("google");
  });

  test("gap list opens a study plan; an interview row opens its replay", async ({ page }) => {
    await page.getByRole("button", { name: /Recursion Seen in 4 answers/ }).click();
    const sheet = page.getByRole("dialog", { name: "Recursion" });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole("button", { name: "Close study plan" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();

    await page.getByRole("button", { name: /^Meta · Senior Engineer/ }).click();
    await expect(page).toHaveURL(/\/replay\/8$/);
  });

  test("meets WCAG 2 A/AA", async ({ page }) => {
    await page.waitForTimeout(800);
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  });
});

test("a new account sees how it works instead of empty panels", async ({ page, backend: _, signedIn: __ }) => {
  await page.goto("/");
  await expect(page.getByText("Your first session sets your rating.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "How it works" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recent activity" })).toHaveCount(0);
});
