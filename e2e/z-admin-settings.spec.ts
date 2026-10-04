import { expect, test } from "@playwright/test";
import { signIn } from "./admin";

// Runs last: it changes the shop-wide fees that earlier specs assert on.

test("settings change the storefront", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/settings");
  await expect(page.getByLabel("Free-shipping threshold")).toHaveValue("1,500");
  // Delivery is Cebu-only, so the fees for other regions are not offered.
  await expect(page.getByLabel("NCR shipping fee")).toHaveCount(0);
  await expect(page.getByLabel("Luzon shipping fee")).toHaveCount(0);
  await page.getByLabel("Delivery fee").fill("oops");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Enter an amount like 80 or 1,500.")).toBeVisible();
  await page.getByLabel("Delivery fee").fill("95");
  await page.getByLabel("Free-shipping threshold").fill("2,000");
  await page.getByLabel("GCash number").fill("0998 765 4321");
  await page.getByLabel("Pickup details").fill("Unit 2, 14 Sample St, Lahug. 10am to 6pm.");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Settings saved")).toBeVisible();

  await page.goto("/product/chocolate-berry-cake"); // ₱520
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByRole("dialog")).toContainText("₱1,480 away from free shipping");
  await page.getByRole("dialog").getByRole("link", { name: /checkout/i }).click();
  await expect(page.getByTestId("summary")).toContainText("₱95");
  await page.getByLabel("GCash", { exact: true }).check();
  await expect(page.getByText(/0998 765 4321/)).toBeVisible();
  await page.getByLabel("Pickup", { exact: true }).check();
  await expect(page.getByText("Unit 2, 14 Sample St, Lahug. 10am to 6pm.")).toBeVisible();
});
