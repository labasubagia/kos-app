import { test, expect } from "@playwright/test";
import { hasCreds, login, uniqueName } from "./harness";

test.skip(!hasCreds(), "E2E credentials not set");

test("location CRUD round-trip", async ({ page }) => {
  await login(page);
  await page.goto("/locations");

  const name = uniqueName("L");
  await page.getByRole("button", { name: "Add location" }).click();
  await page.locator("[data-slot=dialog-content] input[placeholder]").fill(name);
  await page.locator("[data-slot=dialog-content] button", { hasText: "Create" }).click();
  await expect(page.getByText(name)).toBeVisible();

  const row = page.locator("tbody tr", { hasText: name });
  await row.locator("button").nth(1).click();
  await expect(page.getByText(name)).toHaveCount(0);
});
