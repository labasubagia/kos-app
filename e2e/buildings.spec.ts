import { test, expect } from "@playwright/test";
import { hasCreds, login, selectOption, uniqueName } from "./harness";

test.skip(!hasCreds(), "E2E credentials not set");

test("building CRUD round-trip with location select", async ({ page }) => {
  await login(page);
  await page.goto("/buildings");

  const name = uniqueName("B");
  await page.getByRole("button", { name: "Add building" }).click();
  await selectOption(page, "Location", "Kos Br Tegal");
  await page.locator("[data-slot=dialog-content] input[placeholder]").fill(name);
  await page.locator("[data-slot=dialog-content] button", { hasText: "Create" }).click();
  await expect(page.getByText(name)).toBeVisible();

  const row = page.locator("tbody tr", { hasText: name });
  await row.locator("button").nth(1).click();
  await expect(page.getByText(name)).toHaveCount(0);
});
