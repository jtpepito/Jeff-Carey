import { expect, test } from "@playwright/test";
import { signIn } from "./admin";

test("admin pages redirect to login when signed out", async ({ page }) => {
  for (const url of ["/admin", "/admin/orders", "/admin/products", "/admin/settings"]) {
    await page.goto(url);
    await expect(page).toHaveURL(/\/admin\/login$/);
  }
});

test("wrong password is refused, right password signs in, sign out works", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Password").fill("nope");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Wrong password.")).toBeVisible();
  await signIn(page);
  await expect(page.getByRole("link", { name: "Orders" })).toBeVisible();
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test("a forged session cookie is rejected", async ({ page, context }) => {
  await context.addCookies([{ name: "jc_admin", value: `${Date.now() + 100000}.deadbeef`, url: "http://localhost:3218" }]);
  await page.goto("/admin/orders");
  await expect(page).toHaveURL(/\/admin\/login$/);
});
