import { expect, test } from "@playwright/test";
import { signIn } from "./admin";

// Runs last of all: it deletes the test shop's order history.

test("clearing the order history needs DELETE typed, empties the list and puts stock back", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/products");
  await page.getByRole("link", { name: /OG Cinnamon Rolls/ }).click();
  const stockBefore = Number(await page.getByLabel("Variant 1 stock").inputValue());

  await page.goto("/admin/orders");
  await expect(page.getByTestId("order-row").first()).toBeVisible();
  await page.getByRole("button", { name: "Clear order history" }).click();
  const confirm = page.getByRole("button", { name: "Delete all orders" });
  await expect(confirm).toBeDisabled();
  await page.getByLabel("Type DELETE").fill("delete");
  await expect(confirm).toBeDisabled();
  await page.getByLabel("Type DELETE").fill("DELETE");
  await confirm.click();
  await expect(page.getByText(/^Deleted \d+ orders?; \d+ units back in stock$/)).toBeVisible();
  await expect(page.getByText("No orders yet")).toBeVisible();
  await expect(page.getByRole("button", { name: "Clear order history" })).toBeDisabled();

  await page.goto("/admin/products");
  await page.getByRole("link", { name: /OG Cinnamon Rolls/ }).click();
  expect(Number(await page.getByLabel("Variant 1 stock").inputValue())).toBeGreaterThan(stockBefore);
});
