import { expect, test } from "@playwright/test";

test("add to cart, change qty, pickup-only note, persistence", async ({ page }) => {
  await page.goto("/product/og-cinnamon-rolls"); // Box of 4 ₱231
  await page.getByRole("button", { name: "Add to cart" }).click();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toContainText("OG Cinnamon Rolls");
  await expect(drawer).toContainText("Pick-up only. No delivery fee.");
  await expect(drawer).not.toContainText("free shipping");
  await drawer.getByRole("button", { name: "Increase quantity" }).click();
  await expect(drawer).toContainText("₱462");
  await page.reload();
  await expect(page.getByRole("button", { name: "Open cart" })).toContainText("2");
});

test("removing the last item shows the empty cart", async ({ page }) => {
  await page.goto("/product/vanilla-cupcake");
  await page.getByRole("button", { name: "Add to cart" }).click();
  const drawer = page.getByRole("dialog");
  await drawer.getByRole("button", { name: /Remove/ }).click();
  await expect(drawer).toContainText("Your cart is empty");
});

test("corrupt or stale cart storage does not crash the site", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.setItem("jc-cart-v1", "{not json"));
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.evaluate(() =>
    localStorage.setItem(
      "jc-cart-v1",
      JSON.stringify([
        { variantId: 987654, qty: 1, productName: "Ghost", variantName: "X", slug: "ghost", price: 100, image: null, stock: 3 },
      ]),
    ),
  );
  await page.reload();
  await page.getByRole("button", { name: "Open cart" }).click();
  await expect(page.getByRole("dialog")).toContainText("Ghost — X is no longer available");
  await expect(page.getByRole("dialog")).toContainText("Your cart is empty");
});

test("adding a second product keeps both in the cart", async ({ page }) => {
  await page.goto("/product/og-cinnamon-rolls");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByRole("dialog")).toContainText("OG Cinnamon Rolls");
  await page.goto("/product/vanilla-cupcake");
  await page.getByRole("button", { name: "Add to cart" }).click();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toContainText("Vanilla Cupcake");
  await expect(drawer).toContainText("OG Cinnamon Rolls");
  await expect(drawer).toContainText("₱331");
  await expect(drawer).not.toContainText("no longer available");
});
