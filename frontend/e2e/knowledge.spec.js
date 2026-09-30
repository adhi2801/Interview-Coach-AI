import { expect, test, KNOWLEDGE } from "./fixtures";

const node = (page, label) => page.getByRole("button", { name: new RegExp(`^${label},`) });

test.describe("knowledge graph", () => {
  test.beforeEach(async ({ page, backend: _, signedIn: __ }) => {
    await page.goto("/study-plan");
    await expect(node(page, "Arrays")).toBeVisible();
  });

  test("leads with touched subjects, folds the rest, and can show every topic", async ({ page }) => {
    const total = KNOWLEDGE.topics.length;
    const topics = page.getByRole("button", { name: /, (shown in your answers|gap in your answers|locked|not attempted yet|ready to learn)$/ });
    expect(await topics.count()).toBeLessThan(total);                         // untouched subjects start folded
    await expect(page.getByText(/7 subjects you haven't tried are folded/)).toBeVisible();

    await page.getByRole("button", { name: "Show Databases topics" }).click();
    await expect(node(page, "SQL")).toBeVisible();

    await page.getByRole("button", { name: "Show every subject" }).click();
    await expect(topics).toHaveCount(total);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/3 gaps are holding back \d+ topics\./);
    await expect(page.getByRole("heading", { name: "Where to start" })).toBeVisible();
  });

  test("selecting a topic traces its chain and explains it", async ({ page }) => {
    await node(page, "Dijkstra").click();
    const panel = page.getByRole("complementary", { name: "Topic details" });
    await expect(panel.getByRole("heading", { name: "Dijkstra" })).toBeVisible();
    await expect(panel.getByText("Learn in this order")).toBeVisible();
    await expect(panel.locator("ol > li").last()).toContainText("Dijkstra");
    await expect.poll(() => page.locator("svg path.km-trace").count()).toBeGreaterThan(2);

    await page.keyboard.press("Escape");
    await expect(panel.getByRole("heading", { name: "Where to start" })).toBeVisible();
  });

  test("search and the legend narrow what stands out", async ({ page }) => {
    await page.getByRole("searchbox", { name: "Find a topic" }).fill("tree");
    await expect(node(page, "Binary trees")).toHaveAttribute("data-dimmed", "false");
    await expect(node(page, "Arrays")).toHaveAttribute("data-dimmed", "true");
    await page.getByRole("searchbox", { name: "Find a topic" }).fill("sharding");
    await expect(node(page, "Sharding")).toBeVisible();                       // a search opens its folded subject
    await page.getByRole("searchbox", { name: "Find a topic" }).fill("");

    await page.getByRole("button", { name: /^Gap/ }).click();
    await expect(node(page, "Hash maps")).toHaveAttribute("data-dimmed", "false");
    await expect(node(page, "Arrays")).toHaveAttribute("data-dimmed", "true");
  });
});
