import { expect, test, SESSION, LOGIN_TOKEN } from "./fixtures";

test.describe("login", () => {
  test("a wrong password shows the server's message; the right one opens the dashboard", async ({ page, backend }) => {
    await page.goto("/login");
    await page.getByPlaceholder(/@/).fill("ada@example.com");
    await page.getByPlaceholder("••••••••").fill("wrong-password");
    await page.getByRole("button", { name: /log in|sign in/i }).first().click();
    await expect(page.getByText("Invalid email or password")).toBeVisible();

    await page.getByPlaceholder("••••••••").fill("correct-horse");
    await page.getByRole("button", { name: /log in|sign in/i }).first().click();
    await expect(page.getByRole("heading", { name: /Good (morning|afternoon|evening|night), Ada/ })).toBeVisible();
    expect(backend.calls.filter((c) => c.path === "/auth/login")).toHaveLength(2);
  });

  test("the password toggle is labelled and reveals the password", async ({ page, backend: _ }) => {
    await page.goto("/login");
    const password = page.getByPlaceholder("••••••••");
    await password.fill("secret-value");
    await page.getByRole("button", { name: "Show password" }).click();
    await expect(password).toHaveAttribute("type", "text");
    await expect(page.getByRole("button", { name: "Hide password" })).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("interview room", () => {
  test("live coaching, keyboard submit, debrief, and retry", async ({ page, backend, signedIn: _ }) => {
    await page.goto("/setup");
    await page.getByRole("button", { name: "Start interview" }).click();
    await page.getByRole("button", { name: /Skip/ }).click();
    await expect(page).toHaveURL(/\/interview$/);
    await expect(page.getByRole("region", { name: "Interview question" })).toContainText(SESSION.scenario);

    // The socket connects with the short-lived ticket — never the login token.
    await expect.poll(() => backend.socket.urls.length).toBe(1);
    expect(backend.socket.urls[0]).toContain("ticket=short-lived-ticket");
    expect(backend.socket.urls[0]).not.toContain(LOGIN_TOKEN);

    // Typing streams the answer to the coach; the filler count is a number.
    const answerBox = page.getByRole("textbox", { name: "Your answer" });
    await answerBox.fill("Um, I would use a token bucket, uh, per user in Redis.");
    await expect(page.getByText("Filler words2")).toBeVisible();

    // Ctrl/Cmd+Enter submits while answering.
    await answerBox.press("Control+Enter");
    await expect(page.getByText("Retry this question")).toBeVisible();
    const submit = backend.calls.find((c) => c.path === "/answer/submit");
    expect(submit.body.question).toBe(SESSION.question);

    // Retry: empty, enabled answer box, a running clock, and a fresh coach.
    await page.getByRole("button", { name: /Retry this question/ }).first().click();
    await expect(answerBox).toBeEnabled();
    await expect(answerBox).toHaveValue("");
    await expect(page.getByText("Filler words0")).toBeVisible();
    await expect.poll(() => backend.socket.received.some((m) => m.type === "reset")).toBe(true);
  });

  test("the end-early dialog is accessible and closes on Escape", async ({ page, backend: _, signedIn: __ }) => {
    await page.goto("/setup");
    await page.getByRole("button", { name: "Start interview" }).click();
    await page.getByRole("button", { name: /Skip/ }).click();

    await page.getByRole("button", { name: "End early" }).click();
    const dialog = page.getByRole("alertdialog", { name: "End the interview now?" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Answers you already submitted stay scored");
    await expect(dialog.getByRole("button", { name: "Keep going" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });
});
