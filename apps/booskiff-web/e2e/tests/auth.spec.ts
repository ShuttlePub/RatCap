import { expect, test } from "@playwright/test";
import { SESSION_COOKIE_NAME, loginViaUi } from "./helpers";

test("unauthenticated /drive redirects to /login", async ({ page }) => {
  await page.goto("/drive");
  await page.waitForURL("**/login", { timeout: 15_000 });
  await expect(page.getByTestId("login-submit")).toBeVisible();
});

test("login via UI lands on /drive", async ({ page }) => {
  await loginViaUi(page);
  await expect(page.getByTestId("drive-page")).toBeVisible();
});

test("session lives in an HttpOnly cookie, never in localStorage", async ({
  page,
}) => {
  await loginViaUi(page);

  const cookies = await page.context().cookies();
  const session = cookies.find((cookie) => cookie.name === SESSION_COOKIE_NAME);
  expect(session, "booskiff_session cookie is set after login").toBeTruthy();
  expect(session?.httpOnly).toBe(true);

  const storage = await page.evaluate(() => JSON.stringify(localStorage));
  expect(storage).not.toMatch(/eyJ[A-Za-z0-9_-]{8,}/);
});

test("logout returns to /login", async ({ page }) => {
  await loginViaUi(page);
  await page.getByTestId("logout-button").click();
  await page.waitForURL("**/login", { timeout: 15_000 });
  await expect(page.getByTestId("login-identifier")).toBeVisible();
});
