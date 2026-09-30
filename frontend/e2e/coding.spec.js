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

  test("run shows sample results; submit shows the review and the rating change", async ({ page, backend }) => {
    await page.getByRole("button", { name: /^Run/ }).click();
    await expect(page.getByText("1 of 1 examples passed")).toBeVisible();

    await page.getByRole("button", { name: /^Submit/ }).click();
    await expect(page.getByRole("tab", { name: "Review" })).toHaveAttribute("aria-selected", "true");
    await expect(page.getByText("Clean and direct.")).toBeVisible();
    await expect(page.getByText("+16")).toBeVisible();                       // 1,200 → 1,216
    expect(backend.calls.filter((c) => c.path === "/coding/submit")).toHaveLength(1);

    await page.getByRole("tab", { name: "Output" }).click();
    await expect(page.getByText("2 of 2 tests passed")).toBeVisible();
    await expect(page.getByRole("region", { name: "Attempts on this problem" }).getByRole("listitem")).toHaveCount(2);
  });

  test("Ctrl+Enter runs the examples while typing in the editor, once", async ({ page, backend }) => {
    await editor(page).click();
    await page.keyboard.press("Control+Enter");
    await expect(page.getByText("1 of 1 examples passed")).toBeVisible();
    expect(backend.calls.filter((c) => c.path === "/coding/run")).toHaveLength(1);
  });

  test("a failing example shows what went wrong and links to the line", async ({ page }) => {
    await page.route("http://localhost:8000/coding/run", (route) => route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({
        results: [{ passed: false, input: "1 2", expected: "3", actual: "", stderr: `File "main.py", line 1\nNameError: name 'x' is not defined` }],
        passed_count: 0, total: 1,
      }),
    }));
    await page.getByRole("button", { name: /^Run/ }).click();
    await expect(page.getByText("0 of 1 examples passed")).toBeVisible();
    await expect(page.getByText("(nothing printed)")).toBeVisible();
    await expect(page.getByText(/NameError/)).toBeVisible();
    await page.getByRole("button", { name: "Go to line 1" }).click();
  });

  test("a failed run says nothing was scored and can be retried", async ({ page }) => {
    await page.route("http://localhost:8000/coding/run", (route) => route.fulfill({
      status: 503, contentType: "application/json", body: JSON.stringify({ error: "The code sandbox is busy." }),
    }));
    await page.getByRole("button", { name: /^Run/ }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Your code wasn't run" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
  });
});

test.describe("coding room on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("problem, code and output are each reachable, and nothing scrolls sideways", async ({ page, backend: _, signedIn: __ }) => {
    await page.goto("/coding");
    await expect(page.getByRole("heading", { name: "Two Sum" })).toBeVisible();

    await page.getByRole("button", { name: "Code", exact: true }).click();
    await expect(editorText(page)).toContainText("two_sum in Python", { timeout: 20_000 });
    await page.getByRole("button", { name: /^Run/ }).click();
    await expect(page.getByText("1 of 1 examples passed")).toBeVisible();   // switched to Output

    await page.getByRole("button", { name: "Problem", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Two Sum" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  });
});
