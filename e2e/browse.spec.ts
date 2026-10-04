import { expect, test } from "@playwright/test";

test("home shows hero product, best sellers and categories", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /shop now/i })).toBeVisible();
  for (const c of ["Coffee", "Tablea & Cacao", "Pantry"])
    await expect(page.getByRole("link", { name: new RegExp(c) }).first()).toBeVisible();
});

test("no horizontal scroll at 375px on home, shop and product", async ({ page }) => {
  for (const url of ["/", "/shop", "/product/benguet-arabica"]) {
    await page.goto(url);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test("shop filters by category, searches and sorts by price", async ({ page }) => {
  await page.goto("/shop?category=Pantry");
  await expect(page.getByTestId("product-card")).toHaveCount(4);
  await page.goto("/shop?q=honey");
  await expect(page.getByTestId("product-card")).toHaveCount(1);
  await page.goto("/shop?sort=price-asc");
  await expect(page.getByTestId("product-card").first()).toContainText("Spiced Coconut Vinegar");
  await page.goto("/shop?q=zzzz");
  await expect(page.getByText("No products found")).toBeVisible();
});

test("choosing a category in the filter reloads the grid", async ({ page }) => {
  await page.goto("/shop");
  await expect(page.getByTestId("product-card")).toHaveCount(12);
  await page.getByLabel("Category").selectOption("Coffee");
  await expect(page).toHaveURL(/category=Coffee/);
  await expect(page.getByTestId("product-card")).toHaveCount(4);
});

test("product page: compare-at, sold-out variant disabled, related products", async ({ page }) => {
  await page.goto("/product/benguet-arabica");
  await expect(page.getByTestId("price").locator("s")).toContainText("₱550");
  await page.goto("/product/mt-apo-natural");
  await expect(page.getByRole("radio", { name: /500g/ })).toBeDisabled();
  await expect(page.getByTestId("related").getByTestId("product-card")).toHaveCount(3);
});

test("unknown product is a 404", async ({ page }) => {
  expect((await page.goto("/product/nope"))!.status()).toBe(404);
});
