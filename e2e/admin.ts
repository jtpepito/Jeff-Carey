import type { Page } from "@playwright/test";

/** Signs in with the password the e2e servers are started with (see playwright.config.ts). */
export async function signIn(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Password").fill("e2e-admin-pass");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/admin");
}
