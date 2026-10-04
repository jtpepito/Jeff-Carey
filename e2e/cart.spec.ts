import { expect, test } from "@playwright/test";

test("add to cart, change qty, free-shipping bar, persistence", async ({ page }) => {
  await page.goto("/product/benguet-arabica"); // ₱480
  await page.getByRole("button", { name: "Add to cart" }).click();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toContainText("Benguet Arabica");
  await expect(drawer).toContainText("₱1,020 away from free shipping");
  await drawer.getByRole("button", { name: "Increase quantity" }).click();
  await expect(drawer).toContainText("₱540 away from free shipping");
  await page.reload();
  await expect(page.getByRole("button", { name: "Open cart" })).toContainText("2");
});

test("free-shipping message appears at the threshold", async ({ page }) => {
  await page.goto("/product/mt-apo-natural"); // ₱650 x 3 = ₱1,950
  await page.getByRole("button", { name: "Increase quantity" }).click();
  await page.getByRole("button", { name: "Increase quantity" }).click();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByRole("dialog")).toContainText("You've unlocked free shipping");
});

test("removing the last item shows the empty cart", async ({ page }) => {
  await page.goto("/product/batangas-barako");
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
  await page.goto("/product/benguet-arabica");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByRole("dialog")).toContainText("Benguet Arabica");
  await page.goto("/product/wild-forest-honey");
  await page.getByRole("button", { name: "Add to cart" }).click();
  const drawer = page.getByRole("dialog");
  await expect(drawer).toContainText("Wild Forest Honey");
  await expect(drawer).toContainText("Benguet Arabica");
  await expect(drawer).toContainText("₱930");
  await expect(drawer).not.toContainText("no longer available");
});
