import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./admin";

async function addAndCheckout(page: Page, slug: string, extraQty = 0) {
  await page.goto(`/product/${slug}`);
  for (let i = 0; i < extraQty; i++) await page.getByRole("button", { name: "Increase quantity" }).click();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.getByRole("dialog").getByRole("link", { name: /checkout/i }).click();
  await expect(page).toHaveURL(/\/checkout/);
}

async function fillContact(page: Page, province = "Cebu", city = "Cebu City") {
  await page.getByLabel("Full name").fill("Ana Reyes");
  await page.getByLabel("Mobile number").fill("09171234567");
  await page.getByLabel("Province").selectOption(province);
  await page.getByLabel("City / Municipality").selectOption(city);
  await page.getByLabel("Street address").fill("12 Mabini St");
}

test("COD order: no reference field, correct totals, thank-you page", async ({ page }) => {
  await addAndCheckout(page, "sprinkle-donuts"); // ₱390
  await fillContact(page);
  await page.getByLabel("Cash on delivery").check();
  await expect(page.getByLabel("GCash reference number")).toHaveCount(0);
  await expect(page.getByTestId("summary")).toContainText("₱160");
  await expect(page.getByTestId("summary")).toContainText("₱550");
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page).toHaveURL(/\/thank-you\/JC-\d{4}-\d{4}/);
  await expect(page.getByText(/pay the rider/i)).toBeVisible();
  await expect(page.getByText("Sprinkle Donuts — Chocolate glaze")).toBeVisible();
  // Order codes are guessable, so the receipt must not show who ordered or where it is going.
  await expect(page.locator("main")).not.toContainText("Mabini");
  await expect(page.locator("main")).not.toContainText("Ana");
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Open cart" })).not.toContainText("1");
});

test("GCash order requires a reference", async ({ page }) => {
  await addAndCheckout(page, "chocolate-cupcakes");
  await fillContact(page, "Cebu", "Cebu City");
  await page.getByLabel("GCash", { exact: true }).check();
  await expect(page.getByText(/0917 000 0000/)).toBeVisible();
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page.getByText("Enter your GCash reference number.")).toBeVisible();
  await page.getByLabel("GCash reference number").fill("1234567890123");
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page).toHaveURL(/\/thank-you\//);
  await expect(page.getByText(/verify your GCash reference/i)).toBeVisible();
  await expect(page.locator("main")).not.toContainText("1234567890123");
});

test("a dropped connection shows a retry message, and retrying places one order", async ({ page }) => {
  await addAndCheckout(page, "hokkaido-milk-loaf");
  await fillContact(page);
  await page.route("**/checkout", (route) => (route.request().method() === "POST" ? route.abort() : route.continue()));
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page.getByText(/couldn't reach the shop/i)).toBeVisible();
  await page.unroute("**/checkout");
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page).toHaveURL(/\/thank-you\/JC-\d{4}-\d{4}/);
});

test("contact errors show beside the field", async ({ page }) => {
  await addAndCheckout(page, "iced-sugar-cookies");
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page.getByText("Enter your name.")).toBeVisible();
  await fillContact(page);
  await page.getByLabel("Mobile number").fill("12345");
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page.getByText("Enter an 11-digit mobile number starting with 09.")).toBeVisible();
});

test("shipping is free in the summary at ₱1,500 or more", async ({ page }) => {
  await addAndCheckout(page, "red-velvet-cupcakes", 6); // ₱240 x 7 = ₱1,680
  await fillContact(page, "Cebu", "Mandaue City");
  await expect(page.getByTestId("summary")).toContainText("Free");
});

test("double tap on Place order creates one order", async ({ page }) => {
  await addAndCheckout(page, "iced-sugar-cookies");
  await fillContact(page);
  await page.getByLabel("Cash on delivery").check();
  await page.getByRole("button", { name: "Place order" }).dblclick();
  await expect(page).toHaveURL(/\/thank-you\/JC-\d{4}-\d{4}/);
  const [prefix, month, n] = page.url().split("/").pop()!.split("-");
  // If the double tap had made a second order, it would have taken the next number.
  const next = `${prefix}-${month}-${String(Number(n) + 1).padStart(4, "0")}`;
  expect((await page.request.get(`/thank-you/${next}`)).status()).toBe(404);
});

test("only Cebu can be chosen, and the delivery fee shows without picking a province", async ({ page }) => {
  await addAndCheckout(page, "hokkaido-milk-loaf"); // ₱190
  await expect(page.getByLabel("Province").locator("option")).toHaveText(["Cebu"]);
  await expect(page.getByTestId("summary")).toContainText("₱160");
  await expect(page.getByTestId("summary")).toContainText("₱350");
  await expect(page.getByLabel("City / Municipality").locator("option", { hasText: "Lapu-Lapu City" })).toHaveCount(1);
  await expect(page.getByLabel("City / Municipality").locator("option", { hasText: "Quezon City" })).toHaveCount(0);
});

test("pickup: no address, no delivery fee, and the admin sees it as a pickup order", async ({ page }) => {
  await addAndCheckout(page, "sprinkle-donuts"); // ₱390
  await page.getByLabel("Full name").fill("Lia Go");
  await page.getByLabel("Mobile number").fill("09175556666");
  await expect(page.getByTestId("summary")).toContainText("₱550"); // delivery is the default: 390 + 160
  await page.getByLabel("Pickup", { exact: true }).check();
  await expect(page.getByLabel("Street address")).toHaveCount(0);
  await expect(page.getByLabel("Province")).toHaveCount(0);
  await expect(page.getByText("We'll text you the pickup address and time")).toBeVisible();
  await expect(page.getByTestId("summary")).not.toContainText("₱160");
  await expect(page.getByTestId("summary")).not.toContainText("₱550");
  await page.getByLabel("Cash on pickup").check();
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page).toHaveURL(/\/thank-you\/JC-\d{4}-\d{4}/);
  await expect(page.getByText(/pay in cash when you pick up/i)).toBeVisible();
  const code = page.url().split("/").pop()!;

  await signIn(page);
  await page.goto("/admin/orders?status=new");
  const row = page.getByRole("link", { name: new RegExp(code) });
  await expect(row).toContainText("Pickup");
  await expect(row).toContainText("₱390");
  await row.click();
  await expect(page.getByText("Customer will pick up")).toBeVisible();
  await expect(page.getByText("Collect ₱390 at pickup.")).toBeVisible();
});

test("switching back to delivery brings the address fields and fee back", async ({ page }) => {
  await addAndCheckout(page, "sprinkle-donuts");
  await page.getByLabel("Pickup", { exact: true }).check();
  await page.getByLabel("Delivery", { exact: true }).check();
  await expect(page.getByLabel("Street address")).toBeVisible();
  await expect(page.getByTestId("summary")).toContainText("₱550");
});

test("empty cart at checkout shows an empty state", async ({ page }) => {
  await page.goto("/checkout");
  await expect(page.getByText("Your cart is empty")).toBeVisible();
});

test("unknown order code is a 404", async ({ page }) => {
  expect((await page.goto("/thank-you/JC-0000-0000"))!.status()).toBe(404);
});
