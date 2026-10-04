import { expect, test } from "@playwright/test";

test.use({ baseURL: "http://localhost:3219" });

test("unseeded database renders designed empty states", async ({ page }) => {
  expect((await page.goto("/"))!.status()).toBe(200);
  await expect(page.getByText("Products coming soon")).toBeVisible();
  expect((await page.goto("/shop"))!.status()).toBe(200);
  await expect(page.getByText("No products found")).toBeVisible();
});
