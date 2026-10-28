import { expect, test } from "@playwright/test";
import { signIn } from "./admin";

// Runs last: it changes shop-wide settings that earlier specs assert on.

test("settings change the storefront", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/settings");
  // Pickup-only: no delivery fees or free-shipping threshold to set.
  await expect(page.getByLabel("Delivery fee")).toHaveCount(0);
  await expect(page.getByLabel("Free-shipping threshold")).toHaveCount(0);
  await expect(page.getByLabel("NCR shipping fee")).toHaveCount(0);

  await page.getByLabel("Target markup").fill("abc");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Enter a multiplier above 0, like 5 or 3.5.")).toBeVisible();
  await page.getByLabel("Target markup").fill("5");
  await page.getByLabel("GCash number").fill("0998 765 4321");
  await page.getByLabel("Pickup details").fill("Unit 2, 14 Sample St, Lahug. 10am to 6pm.");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Settings saved")).toBeVisible();

  await page.goto("/product/og-cinnamon-rolls"); // Box of 4 ₱231
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByRole("dialog")).toContainText("Pick-up only");
  await expect(page.getByRole("dialog")).not.toContainText("free shipping");
  await page.getByRole("dialog").getByRole("link", { name: /checkout/i }).click();
  await expect(page.getByText("Unit 2, 14 Sample St, Lahug. 10am to 6pm.")).toBeVisible();
  await page.getByLabel("GCash", { exact: true }).check();
  await expect(page.getByText(/0998 765 4321/)).toBeVisible();
});
