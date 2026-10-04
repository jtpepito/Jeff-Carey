import { expect, test } from "@playwright/test";
import { signIn } from "./admin";

test("a storefront order appears as new with correct totals, then cancel restores stock", async ({ page }) => {
  await page.goto("/product/cacao-husk-tea"); // ₱280
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.getByRole("dialog").getByRole("link", { name: /checkout/i }).click();
  await page.getByLabel("Full name").fill("Carlo Dizon");
  await page.getByLabel("Mobile number").fill("09181112222");
  await page.getByLabel("Province").selectOption("Benguet");
  await page.getByLabel("City / Municipality").selectOption("Baguio City");
  await page.getByLabel("Street address").fill("5 Session Rd");
  await page.getByLabel("GCash", { exact: true }).check();
  await page.getByLabel("GCash reference number").fill("9988776655443");
  await page.getByRole("button", { name: "Place order" }).click();
  await page.waitForURL(/\/thank-you\//);
  const code = page.url().split("/").pop()!;

  await signIn(page);

  // Stock of "Original" after the order, read from the product editor.
  await page.goto("/admin/products");
  await page.getByRole("link", { name: /Cacao Husk Tea/ }).click();
  const stockAfterOrder = Number(await page.getByLabel("Variant 1 stock").inputValue());

  await page.goto("/admin/orders?status=new");
  const row = page.getByRole("link", { name: new RegExp(code) });
  await expect(row).toContainText("Carlo Dizon");
  await expect(row).toContainText("₱400"); // 280 + 120 Luzon
  await row.click();
  await expect(page.getByText("GCash ref: 9988776655443")).toBeVisible();
  await expect(page.getByText("Cacao Husk Tea — Original")).toBeVisible();

  await page.getByLabel("Internal notes").fill("Verified payment");
  await page.getByRole("button", { name: "Save notes" }).click();
  await expect(page.getByText("Notes saved")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Internal notes")).toHaveValue("Verified payment");

  await page.getByRole("button", { name: "Mark confirmed" }).click();
  await expect(page.getByTestId("status")).toHaveText(/confirmed/i);
  await expect(page.getByRole("button", { name: "Mark delivered" })).toHaveCount(0);

  await page.getByRole("button", { name: "Cancel order" }).click();
  await page.getByRole("button", { name: "Yes, cancel and restock" }).click();
  await expect(page.getByTestId("status")).toHaveText(/cancelled/i);
  await expect(page.getByRole("button", { name: /mark|cancel order/i })).toHaveCount(0);

  await page.goto("/admin/products");
  await page.getByRole("link", { name: /Cacao Husk Tea/ }).click();
  await expect(page.getByLabel("Variant 1 stock")).toHaveValue(String(stockAfterOrder + 1));
});

test("dashboard shows the four stats", async ({ page }) => {
  await signIn(page);
  for (const label of ["Orders today", "Revenue today", "Pending", "Low stock"])
    await expect(page.getByText(label, { exact: true })).toBeVisible();
});

test("unknown order id is a 404", async ({ page }) => {
  await signIn(page);
  expect((await page.goto("/admin/orders/999999"))!.status()).toBe(404);
});
