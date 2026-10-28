import { expect, test, type Page } from "@playwright/test";
import { earliestDate, signIn } from "./admin";

// The shop is pickup-only: checkout asks for contact details and a pickup date, never an address.

async function addAndCheckout(page: Page, slug: string, extraQty = 0) {
  await page.goto(`/product/${slug}`);
  for (let i = 0; i < extraQty; i++) await page.getByRole("button", { name: "Increase quantity" }).click();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.getByRole("dialog").getByRole("link", { name: /checkout/i }).click();
  await expect(page).toHaveURL(/\/checkout/);
}

async function fillContact(page: Page) {
  await page.getByLabel("Full name").fill("Ana Reyes");
  await page.getByLabel("Mobile number").fill("09171234567");
  await page.getByLabel("Preferred pickup date").fill(earliestDate(3));
}

test("checkout is pickup-only: no delivery choice, no address, no fee", async ({ page }) => {
  await addAndCheckout(page, "vanilla-cupcake"); // Single ₱100
  await expect(page.getByLabel("Delivery", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Street address")).toHaveCount(0);
  await expect(page.getByLabel("Province")).toHaveCount(0);
  await expect(page.getByText("We'll text you the pickup address and time")).toBeVisible();
  await expect(page.getByTestId("summary")).toContainText("No fee");
  await expect(page.getByTestId("summary")).not.toContainText("₱160");
  await expect(page.getByTestId("summary")).toContainText("Total₱100");
});

test("cash order: no reference field, pickup receipt, cart emptied", async ({ page }) => {
  await addAndCheckout(page, "vanilla-cupcake");
  await fillContact(page);
  await page.getByLabel("Cash on pickup").check();
  await expect(page.getByLabel("GCash reference number")).toHaveCount(0);
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page).toHaveURL(/\/thank-you\/JC-\d{4}-\d{4}/);
  await expect(page.getByText(/pay in cash when you pick up/i)).toBeVisible();
  await expect(page.getByText("Vanilla Cupcake — Single")).toBeVisible();
  await expect(page.getByText("Preferred pickup date")).toBeVisible();
  // Order codes are guessable, so the receipt must not show who ordered.
  await expect(page.locator("main")).not.toContainText("Ana");
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Open cart" })).not.toContainText("1");
});

test("GCash order requires a reference and keeps it off the receipt", async ({ page }) => {
  await addAndCheckout(page, "vanilla-cupcake");
  await fillContact(page);
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

test("field errors show beside the field, including a pickup date that is too soon", async ({ page }) => {
  await addAndCheckout(page, "vanilla-cupcake");
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page.getByText("Enter your name.")).toBeVisible();
  await fillContact(page);
  await page.getByLabel("Mobile number").fill("12345");
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page.getByText("Enter an 11-digit mobile number starting with 09.")).toBeVisible();
  await page.getByLabel("Mobile number").fill("09171234567");
  await page.getByLabel("Preferred pickup date").fill(earliestDate(0));
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page.getByText(/at least 2 days/)).toBeVisible();
});

test("the admin sees the order as a pickup with its wanted-by date", async ({ page }) => {
  await addAndCheckout(page, "og-cinnamon-rolls"); // Box of 4 ₱231
  await page.getByLabel("Full name").fill("Lia Go");
  await page.getByLabel("Mobile number").fill("09175556666");
  await page.getByLabel("Preferred pickup date").fill(earliestDate(2));
  await page.getByLabel("Cash on pickup").check();
  await page.getByRole("button", { name: "Place order" }).click();
  await page.waitForURL(/\/thank-you\/JC-\d{4}-\d{4}/);
  const code = page.url().split("/").pop()!;

  await signIn(page);
  await page.goto("/admin/orders?status=new");
  const row = page.getByRole("link", { name: new RegExp(code) });
  await expect(row).toContainText("Pickup");
  await expect(row).toContainText("₱231");
  await expect(row).toContainText("Wanted");
  await row.click();
  await expect(page.getByText("Customer will pick up")).toBeVisible();
  await expect(page.getByText("Collect ₱231 at pickup.")).toBeVisible();
  await expect(page.getByText("Wanted by")).toBeVisible();
});

test("double tap on Place order creates one order", async ({ page }) => {
  await addAndCheckout(page, "vanilla-cupcake");
  await fillContact(page);
  await page.getByLabel("Cash on pickup").check();
  await page.getByRole("button", { name: "Place order" }).dblclick();
  await expect(page).toHaveURL(/\/thank-you\/JC-\d{4}-\d{4}/);
  const [prefix, month, n] = page.url().split("/").pop()!.split("-");
  const next = `${prefix}-${month}-${String(Number(n) + 1).padStart(4, "0")}`;
  expect((await page.request.get(`/thank-you/${next}`)).status()).toBe(404);
});

test("a dropped connection shows a retry message, and retrying places one order", async ({ page }) => {
  await addAndCheckout(page, "vanilla-cupcake");
  await fillContact(page);
  await page.route("**/checkout", (route) => (route.request().method() === "POST" ? route.abort() : route.continue()));
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page.getByText(/couldn't reach the shop/i)).toBeVisible();
  await page.unroute("**/checkout");
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page).toHaveURL(/\/thank-you\/JC-\d{4}-\d{4}/);
});

test("empty cart at checkout shows an empty state", async ({ page }) => {
  await page.goto("/checkout");
  await expect(page.getByText("Your cart is empty")).toBeVisible();
});

test("unknown order code is a 404", async ({ page }) => {
  expect((await page.goto("/thank-you/JC-0000-0000"))!.status()).toBe(404);
});
