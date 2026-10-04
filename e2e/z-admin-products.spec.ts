import { expect, test } from "@playwright/test";
import { signIn } from "./admin";

// The z- prefix runs this after the storefront specs: it deactivates a seeded product they use.

test("create, see on storefront, edit, deactivate", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/products");
  await page.getByRole("link", { name: "New product" }).click();
  await page.getByLabel("Name", { exact: true }).fill("Kapeng Test");
  await expect(page.getByLabel("Slug")).toHaveValue("kapeng-test");
  await page.getByLabel("Category").fill("Cookies");
  await page.getByLabel("Price", { exact: true }).fill("abc");
  await page.getByLabel("Variant 1 name").fill("250g");
  await page.getByLabel("Variant 1 stock").fill("3");
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page.getByText("Enter a price like 450 or 1,299.50.")).toBeVisible();
  await page.getByLabel("Price", { exact: true }).fill("1,250");
  await page.getByLabel("Compare-at price").fill("1,500");
  await page.getByRole("button", { name: "Add variant" }).click();
  await page.getByLabel("Variant 2 name").fill("500g");
  await page.getByLabel("Variant 2 stock").fill("0");
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page).toHaveURL(/\/admin\/products$/);

  await page.goto("/product/kapeng-test");
  const price = page.getByTestId("price");
  await expect(price).toContainText("₱1,250");
  await expect(price.locator("s")).toContainText("₱1,500");
  await expect(page.getByRole("radio", { name: /500g/ })).toBeDisabled();

  await page.goto("/admin/products");
  await page.getByRole("link", { name: /Kapeng Test/ }).click();
  await page.getByLabel("Active").uncheck();
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page).toHaveURL(/\/admin\/products$/);
  expect((await page.goto("/product/kapeng-test"))!.status()).toBe(404);
});

test("duplicate slug shows a field error", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/products/new");
  await page.getByLabel("Name", { exact: true }).fill("Copy");
  await page.getByLabel("Slug").fill("classic-cinnamon-rolls");
  await page.getByLabel("Category").fill("Cookies");
  await page.getByLabel("Price", { exact: true }).fill("100");
  await page.getByLabel("Variant 1 name").fill("A");
  await page.getByLabel("Variant 1 stock").fill("1");
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page.getByText("That slug is already used by another product.")).toBeVisible();
});

test("deleting a product with orders deactivates it instead", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/products");
  await page.getByRole("link", { name: /Classic Cinnamon Rolls/ }).click();
  await page.getByRole("button", { name: "Delete product" }).click();
  await page.getByRole("button", { name: "Yes, delete" }).click();
  await expect(page.getByText(/has past orders, so it was deactivated/i)).toBeVisible();
  expect((await page.goto("/product/classic-cinnamon-rolls"))!.status()).toBe(404);
});
