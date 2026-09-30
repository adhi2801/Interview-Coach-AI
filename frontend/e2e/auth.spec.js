import { expect, test, RENEWED_EXPIRES_AT } from "./fixtures";

test("forgot password: from the login page to 'check your email'", async ({ page, backend }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: "Forgot your password?" }).click();
  await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
  await page.getByLabel("Email").fill("ada@example.com");
  await page.getByRole("button", { name: "Send the reset link" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
  await expect(page.getByText("It works for 30 minutes.")).toBeVisible();
  expect(backend.calls.find((c) => c.path === "/auth/forgot-password").body).toEqual({ email: "ada@example.com" });
});

test("a reset link sets the password, logs in, and leaves no token in the address bar", async ({ page, backend }) => {
  await page.goto("/reset-password#token=good-token");
  await expect(page.getByRole("heading", { name: "Choose a new password" })).toBeVisible();
  expect(new URL(page.url()).hash).toBe("");

  await page.getByLabel("New password", { exact: true }).fill("a-new-password");
  await page.getByLabel("Confirm new password").fill("a-different-one");
  await page.getByRole("button", { name: "Save and log in" }).click();
  await expect(page.getByText("The two passwords don't match.")).toBeVisible();

  await page.getByLabel("Confirm new password").fill("a-new-password");
  await page.getByRole("button", { name: "Save and log in" }).click();
  await expect(page.getByRole("heading", { name: /Good (morning|afternoon|evening|night), Ada/ })).toBeVisible();
  expect(backend.calls.find((c) => c.path === "/auth/reset-password").body).toEqual({ token: "good-token", new_password: "a-new-password" });
});

test("a used or expired reset link says so", async ({ page, backend: _ }) => {
  await page.goto("/reset-password#token=used-token");
  await page.getByLabel("New password", { exact: true }).fill("a-new-password");
  await page.getByLabel("Confirm new password").fill("a-new-password");
  await page.getByRole("button", { name: "Save and log in" }).click();
  await expect(page.getByRole("alert")).toContainText("already been used or has expired");
});

test("a reset link without its token explains what to do", async ({ page, backend: _ }) => {
  await page.goto("/reset-password");
  await expect(page.getByRole("heading", { name: "This link isn't complete" })).toBeVisible();
  await page.getByRole("button", { name: "Ask for a new reset link" }).click();
  await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
});

test("signup counts down to the password minimum", async ({ page, backend: _ }) => {
  await page.goto("/signup");
  await page.getByLabel("Password", { exact: true }).fill("abc");
  await expect(page.getByText("5 more characters to go.")).toBeVisible();
});

test("a login close to expiry is renewed while the app is open", async ({ page, backend, signedIn: _ }) => {
  await page.goto("/");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("session_expires_at"))).toBe(RENEWED_EXPIRES_AT);
  expect(backend.calls.filter((c) => c.path === "/auth/refresh")).toHaveLength(1);
});
