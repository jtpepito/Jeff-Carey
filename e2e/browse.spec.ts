import { expect, test } from "@playwright/test";

test("home shows hero product, best sellers and categories", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /shop now/i })).toBeVisible();
  for (const c of ["Cinnamon Rolls", "Cupcakes"])
    await expect(page.getByRole("link", { name: new RegExp(c) }).first()).toBeVisible();
});

test("no horizontal scroll at 375px on home, shop and product", async ({ page }) => {
  for (const url of ["/", "/shop", "/product/og-cinnamon-rolls"]) {
    await page.goto(url);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

test("shop filters by category, searches and sorts by price", async ({ page }) => {
  await page.goto("/shop?category=Cupcakes");
  await expect(page.getByTestId("product-card")).toHaveCount(1);
  await page.goto("/shop?q=oreo");
  await expect(page.getByTestId("product-card")).toHaveCount(1);
  await page.goto("/shop?sort=price-asc");
  await expect(page.getByTestId("product-card").first()).toContainText("Vanilla Cupcake");
  await page.goto("/shop?q=zzzz");
  await expect(page.getByText("No products found")).toBeVisible();
});

test("choosing a category in the filter reloads the grid", async ({ page }) => {
  await page.goto("/shop");
  await expect(page.getByTestId("product-card")).toHaveCount(5);
  await page.getByLabel("Category").selectOption("Cinnamon Rolls");
  await expect(page).toHaveURL(/category=Cinnamon/);
  await expect(page.getByTestId("product-card")).toHaveCount(4);
});

test("product page: compare-at, sold-out variant disabled, related products", async ({ page }) => {
  await page.goto("/product/og-cinnamon-rolls");
  // Options are priced separately: the page shows the chosen option and the range.
  await expect(page.getByTestId("price")).toContainText("₱231");
  await expect(page.getByTestId("price")).toContainText("to ₱1,731");
  await page.getByRole("radio", { name: /Box of 9/ }).click();
  await expect(page.getByTestId("price")).toContainText("₱473");
  await page.goto("/product/oreo-cinnamon-rolls");
  await expect(page.getByRole("radio", { name: /Tray/ })).toBeDisabled();
  await expect(page.getByTestId("related").getByTestId("product-card")).toHaveCount(3);
});

test("unknown product is a 404", async ({ page }) => {
  expect((await page.goto("/product/nope"))!.status()).toBe(404);
});

test("every response carries the security headers", async ({ page }) => {
  const h = (await page.request.get("/")).headers();
  expect(h["strict-transport-security"]).toContain("max-age=31536000");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(h["x-powered-by"]).toBeUndefined();
});
