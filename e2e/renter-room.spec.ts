import { test, expect } from "@playwright/test";
import { fillByLabel, hasCreds, login, selectOption, uniqueName } from "./harness";

test.skip(!hasCreds(), "E2E credentials not set");

test("renter and room create/delete round-trip", async ({ page }) => {
  await login(page);

  // renter
  const renter = uniqueName("R");
  await page.goto("/renters");
  await page.getByRole("button", { name: "Add renter" }).click();
  await fillByLabel(page, "Name", renter);
  await fillByLabel(page, "Phone", "081200000001");
  await page.locator("[data-slot=dialog-content] button", { hasText: /Create renter/ }).click();
  await expect(page.getByText(renter)).toBeVisible();

  // room
  const room = uniqueName("K");
  await page.goto("/rooms");
  await page.getByRole("button", { name: "Add room" }).click();
  await selectOption(page, "Building *", "Bangunan A");
  await fillByLabel(page, "Name", room);
  await fillByLabel(page, "Capacity", "2");
  await fillByLabel(page, "Monthly rent", "500000");
  await page.locator("[data-slot=dialog-content] button", { hasText: "Create room" }).click();
  await expect(page.getByText(room)).toBeVisible();

  // cleanup via UI
  const roomRow = page.locator("tbody tr", { hasText: room });
  await roomRow.locator('button[aria-label="Delete room"]').click();
  await expect(page.getByText(room)).toHaveCount(0);

  await page.goto("/renters");
  const renterRow = page.locator("tbody tr", { hasText: renter });
  await renterRow.locator('button[title="Delete"]').click();
  await page.locator("[data-slot=dialog-content] button", { hasText: /^Delete$/ }).click();
  await expect(page.getByText(renter)).toHaveCount(0);
});
