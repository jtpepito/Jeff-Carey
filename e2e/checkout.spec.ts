import { expect, test, type Page } from "@playwright/test";

async function addAndCheckout(page: Page, slug: string, extraQty = 0) {
  await page.goto(`/product/${slug}`);
  for (let i = 0; i < extraQty; i++) await page.getByRole("button", { name: "Increase quantity" }).click();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.getByRole("dialog").getByRole("link", { name: /checkout/i }).click();
  await expect(page).toHaveURL(/\/checkout/);
}

async function fillContact(page: Page, province = "Metro Manila", city = "Quezon City") {
  await page.getByLabel("Full name").fill("Ana Reyes");
  await page.getByLabel("Mobile number").fill("09171234567");
  await page.getByLabel("Province").selectOption(province);
  await page.getByLabel("City / Municipality").selectOption(city);
  await page.getByLabel("Street address").fill("12 Mabini St");
}

test("COD order: no reference field, correct totals, thank-you page", async ({ page }) => {
  await addAndCheckout(page, "batangas-barako"); // ₱390
  await fillContact(page);
  await page.getByLabel("Cash on delivery").check();
  await expect(page.getByLabel("GCash reference number")).toHaveCount(0);
  await expect(page.getByTestId("summary")).toContainText("₱80");
  await expect(page.getByTestId("summary")).toContainText("₱470");
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page).toHaveURL(/\/thank-you\/BL-\d{4}-\d{4}/);
  await expect(page.getByText(/pay the rider/i)).toBeVisible();
  await expect(page.getByText("Batangas Barako — 250g")).toBeVisible();
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Open cart" })).not.toContainText("1");
});

test("GCash order requires a reference", async ({ page }) => {
  await addAndCheckout(page, "wild-forest-honey");
  await fillContact(page, "Cebu", "Cebu City");
  await page.getByLabel("GCash", { exact: true }).check();
  await expect(page.getByText(/0917 000 0000/)).toBeVisible();
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page.getByText("Enter your GCash reference number.")).toBeVisible();
  await page.getByLabel("GCash reference number").fill("1234567890123");
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page).toHaveURL(/\/thank-you\//);
  await expect(page.getByText(/verify your GCash reference/i)).toBeVisible();
});

test("contact errors show beside the field", async ({ page }) => {
  await addAndCheckout(page, "negros-muscovado");
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page.getByText("Enter your name.")).toBeVisible();
  await fillContact(page);
  await page.getByLabel("Mobile number").fill("12345");
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page.getByText("Enter an 11-digit mobile number starting with 09.")).toBeVisible();
});

test("shipping is free in the summary at ₱1,500 or more", async ({ page }) => {
  await addAndCheckout(page, "coconut-sugar", 6); // ₱240 x 7 = ₱1,680
  await fillContact(page, "Davao del Sur", "Davao City");
  await expect(page.getByTestId("summary")).toContainText("Free");
});

test("double tap on Place order creates one order", async ({ page }) => {
  await addAndCheckout(page, "negros-muscovado");
  await fillContact(page);
  await page.getByLabel("Cash on delivery").check();
  await page.getByRole("button", { name: "Place order" }).dblclick();
  await expect(page).toHaveURL(/\/thank-you\/BL-\d{4}-\d{4}/);
  const [prefix, month, n] = page.url().split("/").pop()!.split("-");
  // If the double tap had made a second order, it would have taken the next number.
  const next = `${prefix}-${month}-${String(Number(n) + 1).padStart(4, "0")}`;
  expect((await page.request.get(`/thank-you/${next}`)).status()).toBe(404);
});

test("empty cart at checkout shows an empty state", async ({ page }) => {
  await page.goto("/checkout");
  await expect(page.getByText("Your cart is empty")).toBeVisible();
});

test("unknown order code is a 404", async ({ page }) => {
  expect((await page.goto("/thank-you/BL-0000-0000"))!.status()).toBe(404);
});
