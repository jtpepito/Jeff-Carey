import { expect, test } from "@playwright/test";
import { signIn } from "./admin";

// Runs after the storefront specs; it adds an ingredient and a recipe to seeded data.

test("ingredients and a recipe give a product its cost and margin", async ({ page }) => {
  await signIn(page);

  await page.goto("/admin/ingredients");
  await expect(page.getByText("Bread flour")).toBeVisible(); // seeded
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

  await page.goto("/admin/products");
  await expect(page.getByRole("link", { name: /Hokkaido Milk Loaf/ })).toContainText("No recipe");
  await page.getByRole("link", { name: /Hokkaido Milk Loaf/ }).click();
  await expect(page.getByText("No recipe yet")).toBeVisible();
  await page.getByRole("link", { name: "Set up recipe" }).click();

  await page.getByLabel("Batch yield").fill("2");
  await page.getByLabel("Labour minutes").fill("30");
  await page.getByLabel("Packaging cost").fill("5");
  await page.getByLabel("Ingredient 1", { exact: true }).selectOption({ label: "Bread flour" });
  await page.getByLabel(/^Quantity 1/).fill("1000");
  await page.getByRole("button", { name: "Add ingredient line" }).click();
  await page.getByLabel("Ingredient 2", { exact: true }).selectOption({ label: "Test syrup" });
  await page.getByLabel(/^Quantity 2/).fill("100");

  // flour ₱48 + syrup ₱24 = ₱72; labour 30 min at ₱80/h = ₱40; batch ₱112; ÷2 = ₱56 + ₱5 packaging = ₱61; price ₱190
  const summary = page.getByTestId("cost-summary");
  await expect(summary).toContainText("₱72");
  await expect(summary).toContainText("₱40");
  await expect(summary).toContainText("₱112");
  await expect(summary).toContainText("₱61");
  await expect(summary).toContainText("₱129");
  await expect(summary).toContainText("(68%)");

  await page.getByRole("button", { name: "Save recipe" }).click();
  await expect(page.getByText("Recipe saved")).toBeVisible();
  await expect(page).toHaveURL(/\/admin\/products\/\d+$/);
  await expect(page.getByTestId("costing")).toContainText("₱61");
  await expect(page.getByTestId("costing")).toContainText("68%");

  await page.goto("/admin/products");
  await expect(page.getByRole("link", { name: /Hokkaido Milk Loaf/ })).toContainText("Cost ₱61 · 68% margin");

  // The syrup is now in use, so it cannot be deleted.
  await page.goto("/admin/ingredients");
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Delete Test syrup" }).click();
  await expect(page.getByText(/used in 1 recipe/)).toBeVisible();
});

test("a recipe needs a yield, and the labour rate lives in settings", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/products");
  await page.getByRole("link", { name: /Butter Cookie Tin/ }).click();
  await page.getByRole("link", { name: "Set up recipe" }).click();
  await page.getByRole("button", { name: "Save recipe" }).click();
  await expect(page.getByText(/Yield is how many units one batch makes/)).toBeVisible();

  await page.goto("/admin/settings");
  await expect(page.getByLabel("Labour rate per hour")).toHaveValue("80");
});
