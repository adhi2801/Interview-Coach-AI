import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures";

const axe = async (page) => (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze())
  .violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);

test.describe("sessions and replay", () => {
  test.use({ history: "rich", reducedMotion: "reduce" });

  test("list filters and sorts; rating change comes from the activity feed", async ({ page, backend: _, signedIn: __ }) => {
    await page.goto("/replay");
    const rows = page.locator("tbody tr");
    await expect(rows).toHaveCount(9);
    // Meta session 8: activity says -3 (a coding submission sat between interviews).
    await expect(rows.filter({ hasText: "Meta" })).toContainText("-3");

    await page.getByLabel("Company").selectOption("google");
    await expect(rows).toHaveCount(4);
    await page.getByLabel("Sort").selectOption("highest");
    await expect(rows.first()).toContainText("7.8");
    expect(await axe(page)).toEqual([]);
  });

  test("a replay steps through questions and links back to the list", async ({ page, backend: _, signedIn: __ }) => {
    await page.goto("/replay");
    await page.getByRole("button", { name: /^Google · Senior Engineer — L4/ }).first().click();
    await expect(page).toHaveURL(/\/replay\/9$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Google, Senior Engineer — L4");
    await expect(page.getByRole("heading", { level: 2 })).toContainText("Design a rate limiter");

    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("heading", { level: 2 })).toContainText("three regions");
    await expect(page.getByText("Consistency models")).toBeVisible();
    await expect(page.getByText("What the live coach said")).toBeVisible();
    expect(await axe(page)).toEqual([]);

    await page.getByRole("button", { name: "All sessions" }).click();
    await expect(page).toHaveURL(/\/replay$/);
  });
});
