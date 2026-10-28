import type { Page } from "@playwright/test";

/** Signs in with the password the e2e servers are started with (see playwright.config.ts). */

/** The earliest date checkout accepts: two days from today, Manila time, as YYYY-MM-DD. */
export function earliestDate(daysAhead = 2) {
  const d = new Date(Date.now() + 8 * 3600 * 1000 + daysAhead * 86400 * 1000);
  return d.toISOString().slice(0, 10);
}

export async function signIn(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Password").fill("e2e-admin-pass");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("**/admin");
}
