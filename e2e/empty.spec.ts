import { expect, test } from "@playwright/test";

test.use({ baseURL: "http://localhost:3219" });

test("unseeded database renders designed empty states", async ({ page }) => {
  expect((await page.goto("/"))!.status()).toBe(200);
  await expect(page.getByText("Products coming soon")).toBeVisible();
  expect((await page.goto("/shop"))!.status()).toBe(200);
  await expect(page.getByText("No products found")).toBeVisible();
});

test("admin on an unseeded database shows empty states", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Password").fill("e2e-admin-pass");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("No orders yet today")).toBeVisible();
  await expect(page.getByText("Stock levels look healthy")).toBeVisible();
  await page.goto("/admin/orders");
  await expect(page.getByText("No orders yet")).toBeVisible();
  await page.goto("/admin/products");
  await expect(page.getByText("No products yet")).toBeVisible();
});
