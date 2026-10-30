import { expect, test, type Page } from "@playwright/test";
import { earliestDate, RECEIPT, signIn } from "./admin";

// The shop is pickup-only and takes bank transfer or GCash, each with a receipt attached.

async function addAndCheckout(page: Page, slug: string, extraQty = 0) {
  await page.goto(`/product/${slug}`);
  for (let i = 0; i < extraQty; i++) await page.getByRole("button", { name: "Increase quantity" }).click();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.getByRole("dialog").getByRole("link", { name: /checkout/i }).click();
  await expect(page).toHaveURL(/\/checkout/);
}

async function fillContact(page: Page, { receipt = true } = {}) {
  await page.getByLabel("Full name").fill("Ana Reyes");
  await page.getByLabel("Mobile number").fill("09171234567");
  await page.getByLabel("Preferred pickup date").fill(earliestDate(3));
  if (receipt) await page.getByLabel("Proof of payment").setInputFiles(RECEIPT);
}

test("checkout is pickup-only: no delivery choice, no address, no fee", async ({ page }) => {
  await addAndCheckout(page, "vanilla-cupcake"); // Single ₱100
  await expect(page.getByLabel("Delivery", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Street address")).toHaveCount(0);
  await expect(page.getByLabel("Province")).toHaveCount(0);
  await expect(page.getByText("We'll text you the pickup address and time")).toBeVisible();
  await expect(page.getByTestId("summary")).toContainText("No fee");
  await expect(page.getByTestId("summary")).toContainText("Total₱100");
});

test("there is no cash option; bank transfer is the default and shows the account", async ({ page }) => {
  await addAndCheckout(page, "vanilla-cupcake");
  await expect(page.getByLabel("Cash on pickup")).toHaveCount(0);
  await expect(page.getByLabel("Bank transfer")).toBeChecked();
  const bank = page.getByTestId("bank-details");
  await expect(bank).toContainText("China Banking Corporation");
  await expect(bank).toContainText("129000009744");
  await expect(bank).toContainText("Thebakehubbywythlae Space Rental");
  await expect(page.getByText("Transfer ₱100 to:")).toBeVisible();
});

test("bank transfer needs a receipt; with one, the order goes through and the receipt stays private", async ({ page }) => {
  await addAndCheckout(page, "vanilla-cupcake");
  await fillContact(page, { receipt: false });
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page.getByText("Attach a screenshot or photo of your payment so we can verify it.")).toBeVisible();
  await page.getByLabel("Proof of payment").setInputFiles(RECEIPT);
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page).toHaveURL(/\/thank-you\/JC-\d{4}-\d{4}/);
  await expect(page.getByText("Bank transfer", { exact: true })).toBeVisible();
  await expect(page.getByText(/check your transfer receipt/i)).toBeVisible();
  await expect(page.getByText("Vanilla Cupcake — Single")).toBeVisible();
  await expect(page.locator("main")).not.toContainText("Ana");
  await expect(page.locator("main img[src*='proof']")).toHaveCount(0);
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Open cart" })).not.toContainText("1");
});

test("GCash also needs a receipt; the reference number is optional and kept off the receipt page", async ({ page }) => {
  await addAndCheckout(page, "vanilla-cupcake");
  await fillContact(page, { receipt: false });
  await page.getByLabel("GCash", { exact: true }).check();
  await expect(page.getByText(/0917 000 0000/)).toBeVisible();
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page.getByText("Attach a screenshot or photo of your payment so we can verify it.")).toBeVisible();
  await page.getByLabel("Proof of payment").setInputFiles(RECEIPT);
  await page.getByLabel(/Reference number/).fill("1234567890123");
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page).toHaveURL(/\/thank-you\//);
  await expect(page.getByText(/check your GCash receipt/i)).toBeVisible();
  await expect(page.locator("main")).not.toContainText("1234567890123");
});

test("a file that is not a photo or PDF is refused, whatever its name", async ({ page }) => {
  await addAndCheckout(page, "vanilla-cupcake");
  await fillContact(page, { receipt: false });
  await page.getByLabel("Proof of payment").setInputFiles({ name: "receipt.pdf", mimeType: "application/pdf", buffer: Buffer.from("<html><script>alert(1)</script></html>") });
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page.getByText(/Please attach a photo \(JPG, PNG, WebP or HEIC\) or a PDF/)).toBeVisible();
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

test("the admin sees the pickup, the wanted-by date and the receipt; signed-out visitors cannot open the receipt", async ({ page, browser }) => {
  await addAndCheckout(page, "og-cinnamon-rolls"); // Box of 4 ₱231
  await page.getByLabel("Full name").fill("Lia Go");
  await page.getByLabel("Mobile number").fill("09175556666");
  await page.getByLabel("Preferred pickup date").fill(earliestDate(2));
  await page.getByLabel("Proof of payment").setInputFiles(RECEIPT);
  await page.getByRole("button", { name: "Place order" }).click();
  await page.waitForURL(/\/thank-you\/JC-\d{4}-\d{4}/);
  const code = page.url().split("/").pop()!;

  await signIn(page);
  await page.goto("/admin/orders?status=new");
  const row = page.getByRole("link", { name: new RegExp(code) });
  await expect(row).toContainText("Pickup");
  await expect(row).toContainText("₱231");
  await expect(row).toContainText("Bank");
  await row.click();
  await expect(page.getByText("Customer will pick up")).toBeVisible();
  await expect(page.getByText("Wanted by")).toBeVisible();
  await expect(page.getByText("Bank transfer", { exact: true })).toBeVisible();
  const link = page.getByRole("link", { name: "View proof of payment" });
  const href = (await link.getAttribute("href"))!;
  const res = await page.request.get(href);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toMatch(/^image\//);
  expect(res.headers()["cache-control"]).toContain("no-store");

  const stranger = await browser.newContext();
  const blocked = await stranger.request.get(new URL(href, page.url()).toString(), { maxRedirects: 0 });
  expect(blocked.status()).not.toBe(200);
  await stranger.close();
});

test("double tap on Place order creates one order", async ({ page }) => {
  await addAndCheckout(page, "vanilla-cupcake");
  await fillContact(page);
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
