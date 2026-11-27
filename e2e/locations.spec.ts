import { test, expect } from "@playwright/test";
import { createBuilding, createLocation, createRoom } from "./support/helpers";
import { ensureCreds, login, uniqueName } from "./support/harness";

ensureCreds();

test("location CRUD round-trip", async ({ page }) => {
  await login(page);
  const name = uniqueName("L");
  await page.goto("/locations");
  await page.getByRole("button", { name: "Add location" }).click();
  await page.locator("[data-slot=dialog-content] input[placeholder]").fill(name);
  await page.locator("[data-slot=dialog-content] button", { hasText: "Create" }).click();
  await expect(page.getByText(name)).toBeVisible();

  const row = page.locator("tbody tr", { hasText: name });
  await row.locator("button").nth(1).click();
  await expect(page.getByText(name)).toHaveCount(0);
});

test("hierarchy: one tenant can hold multiple locations; building→room resolves under each", async ({
  page,
}) => {
  await login(page);
  const loc1 = uniqueName("LocA");
  const loc2 = uniqueName("LocB");
  const bld = uniqueName("Bld");
  const room = uniqueName("Rm");

  await createLocation(page, loc1);
  await createLocation(page, loc2); // second location under the same tenant

  // second location gets its own building + room
  await createBuilding(page, loc2, bld);
  await createRoom(page, { building: bld, name: room, rent: "500000" });

  await page.goto("/locations");
  await expect(page.getByText(loc1)).toBeVisible();
  await expect(page.getByText(loc2)).toBeVisible();

  await page.goto("/rooms");
  const row = page.locator("tbody tr", { hasText: room });
  await expect(row.getByText(bld)).toBeVisible();
  await expect(row.getByText(loc2)).toBeVisible();
  await expect(row.getByText("available")).toBeVisible();
});
