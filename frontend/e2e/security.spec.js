import { expect, test, ROTATED_TOKEN } from "./fixtures";

test.describe("password & security", () => {
  test.beforeEach(async ({ page, backend: _, signedIn: __ }) => {
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Password and sign-in" })).toBeVisible();
  });

  test("changing the password validates, reports errors, and keeps this device signed in", async ({ page }) => {
    const submit = page.getByRole("button", { name: "Change password" });
    await page.getByLabel("Current password").fill("wrong");
    await page.getByLabel("New password", { exact: true }).fill("new-battery-staple");
    await page.getByLabel("Confirm new password").fill("different");
    await expect(page.getByText("Passwords don't match.")).toBeVisible();
    await expect(submit).toBeDisabled();

    await page.getByLabel("Confirm new password").fill("new-battery-staple");
    await submit.click();
    await expect(page.getByText("Current password is incorrect")).toBeVisible();

    await page.getByLabel("Current password").fill("correct-horse");
    await submit.click();
    await expect(page.getByText("Other devices have been signed out")).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("access_token"))).toBe(ROTATED_TOKEN);
  });

  test("sign out everywhere asks for confirmation, then logs this device out", async ({ page }) => {
    await page.getByRole("button", { name: "Sign out everywhere" }).click();
    await page.getByRole("button", { name: "Yes, sign out everywhere" }).click();
    await expect.poll(() => page.evaluate(() => localStorage.getItem("access_token"))).toBeNull();
  });
});

test("turning live coaching off in Settings hides it in the interview", async ({ page, backend: _, signedIn: __ }) => {
  await page.goto("/settings");
  const toggle = page.getByRole("switch", { name: "Live coaching" });
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-checked", "false");

  await page.goto("/setup");
  await page.getByRole("button", { name: "Start interview" }).click();
  await page.getByRole("button", { name: /Skip/ }).click();
  await expect(page.getByText("Live coaching is off.")).toBeVisible();
  await expect(page.getByText("Filler words", { exact: true })).toHaveCount(0);
});
