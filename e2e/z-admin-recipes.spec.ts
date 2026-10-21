import { expect, test } from "@playwright/test";
import { signIn } from "./admin";

// Runs after the storefront specs; it adds an ingredient, a component and a recipe line to seeded data.

test("ingredients, components and per-option costing", async ({ page }) => {
  await signIn(page);

  // An ingredient is a pack you buy.
  await page.goto("/admin/ingredients");
  await expect(page.getByText("Bread flour")).toBeVisible(); // from the costing file
  await page.getByLabel("Name").fill("Test syrup");
  await page.getByLabel("Unit").fill("ml");
  await page.getByLabel("Pack size").fill("500");
  await page.getByLabel("Pack price").fill("abc");
  await page.getByRole("button", { name: "Add ingredient" }).click();
  await expect(page.getByText("Enter the pack price like 48 or 1,250.50.")).toBeVisible();
  await page.getByLabel("Pack price").fill("120");
  await page.getByRole("button", { name: "Add ingredient" }).click();
  await expect(page.getByText("Ingredient added")).toBeVisible();
  await expect(page.getByText("500 ml for ₱120 · ₱0.24 / ml")).toBeVisible();

  // A component is a sub-recipe: 50 ml of syrup (₱12) makes 100 g of glaze.
  await page.goto("/admin/components");
  await expect(page.getByText("Cinnamon roll dough")).toBeVisible();
  await page.getByRole("button", { name: "New component" }).click();
  await page.getByLabel("Component name").fill("Test glaze");
  await page.getByLabel("Batch makes").fill("100");
  await page.getByLabel("Yield unit").fill("g");
  await page.getByLabel("Ingredient 1", { exact: true }).selectOption({ label: "Test syrup" });
  await page.getByLabel(/^Quantity 1/).fill("50");
  await expect(page.getByText(/Batch costs ₱12/)).toBeVisible();
  await page.getByRole("button", { name: "Save component" }).click();
  await expect(page.getByText("Component saved")).toBeVisible();
  await expect(page.getByText("Makes 100 g for ₱12")).toBeVisible();

  // The OG roll is priced at its suggested price from the file: ₱231 for a box of 4.
  await page.goto("/admin/products");
  await expect(page.getByRole("link", { name: /OG Cinnamon Rolls/ })).toContainText("Cost ₱78.12 – ₱358.05");
  await page.getByRole("link", { name: /OG Cinnamon Rolls/ }).click();
  const costing = page.getByTestId("costing");
  await expect(costing).toContainText("Batch of 42");
  const box4 = costing.locator("tr", { hasText: "Box of 4" });
  await expect(box4).toContainText("₱78.12");
  await expect(box4).toContainText("₱231");
  await expect(box4).toContainText("in use");

  // Add the glaze to the Box of 9 only: 100 g (₱12) more per batch, so that option alone gets dearer.
  await page.getByRole("link", { name: "Edit recipe" }).click();
  const box9 = page.getByTestId(/^option-/).filter({ hasText: "Box of 9" });
  await box9.getByRole("button", { name: "Add box of 9 extra line" }).click();
  await box9.getByLabel("Box of 9 extra 1", { exact: true }).selectOption({ label: "Test glaze" });
  await box9.getByLabel(/^Quantity 1/).fill("100");
  await expect(box9).toContainText("Suggested ₱486"); // (₱400.23 + ₱12) / 42 × 9 = ₱88.34 → × 5 + ₱44 = ₱485.70, rounded up
  await page.getByRole("button", { name: "Save recipe" }).click();
  await expect(page.getByText("Recipe saved")).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/products\/\d+$/);
  const row9 = page.getByTestId("costing").locator("tr", { hasText: "Box of 9" });
  await expect(row9).not.toContainText("in use");
  await page.getByRole("button", { name: "Use suggested price for Box of 9" }).click();
  await expect(page.getByText(/Price set to/)).toBeVisible();
  await expect(page.getByTestId("costing").locator("tr", { hasText: "Box of 9" })).toContainText("in use");
  await expect(page.getByTestId("costing").locator("tr", { hasText: "Box of 4" })).toContainText("in use");

  // The storefront shows the new option price.
  await page.goto("/product/og-cinnamon-rolls");
  await page.getByRole("radio", { name: /Box of 9/ }).click();
  await expect(page.getByTestId("price")).not.toContainText("₱473");

  // The syrup is in use through the component, so it cannot be deleted.
  await page.goto("/admin/ingredients");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete Test syrup" }).click();
  await expect(page.getByText(/used in 1 component line/)).toBeVisible();
});

test("a recipe needs a yield; labour rate and markup live in settings", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/products");
  await page.getByRole("link", { name: /Vanilla Cupcake/ }).click();
  await page.getByRole("link", { name: "Edit recipe" }).click();
  await page.getByLabel("Batch yield").fill("");
  await page.getByRole("button", { name: "Save recipe" }).click();
  await expect(page.getByText(/Yield is how many pieces one batch makes/)).toBeVisible();

  await page.goto("/admin/settings");
  await expect(page.getByLabel("Labour rate per hour")).toHaveValue("80");
  await expect(page.getByLabel("Target markup")).toHaveValue("5");
});
