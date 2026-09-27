import { expect, test } from "./fixtures";

const editor = (page) => page.locator(".monaco-editor").first();
const editorText = (page) => page.locator(".monaco-editor .view-lines").first();

async function chooseLanguage(page, label) {
  await page.getByRole("button", { name: /Python 3\.11|JavaScript ES6|C\+\+ 20|Java 17/ }).first().click();
  await page.getByRole("option", { name: label }).click();
}

test.describe("coding room", () => {
  test.beforeEach(async ({ page, backend: _, signedIn: __ }) => {
    await page.goto("/coding");
    await expect(page.getByText("Two Sum").first()).toBeVisible();
    await expect(editorText(page)).toContainText("two_sum in Python", { timeout: 20_000 });
  });

  test("switching language keeps the same problem and each language's draft", async ({ page }) => {
    await editor(page).click();
    await page.keyboard.press("Control+A");
    await page.keyboard.type("print(3)  # my python answer");

    await chooseLanguage(page, "Java 17");
    await expect(page.getByText("Two Sum").first()).toBeVisible();          // not a different problem
    await expect(editorText(page)).toContainText("two_sum in Java");

    await chooseLanguage(page, "Python 3.11");
    await expect(editorText(page)).toContainText("my python answer");       // draft restored
  });

  test("the draft survives a page reload", async ({ page }) => {
    await editor(page).click();
    await page.keyboard.press("Control+A");
    await page.keyboard.type("print('kept after reload')");
    // Autosave is debounced: wait until the draft is actually stored.
    // Monaco types slowly when the machine is busy, so allow for it.
    await expect.poll(() => page.evaluate(() => localStorage.getItem("ic_draft:two_sum:python")), { timeout: 20_000 })
      .toContain("kept after reload");
    await page.reload();
    await expect(editorText(page)).toContainText("kept after reload", { timeout: 20_000 });
  });

  test("run shows sample results; submit shows the review and new rating", async ({ page, backend }) => {
    await page.getByRole("button", { name: /^Run/ }).click();
    await expect(page.getByText(/1\s*\/\s*1/).first()).toBeVisible();

    await page.getByRole("button", { name: /^Submit/ }).click();
    await expect(page.getByText("Clean and direct.")).toBeVisible();
    expect(backend.calls.filter((c) => c.path === "/coding/submit")).toHaveLength(1);
  });
});
