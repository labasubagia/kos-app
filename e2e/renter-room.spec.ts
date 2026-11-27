import { test, expect } from "@playwright/test";
import { createBuilding, createLocation, createRenter, createRoom } from "./helpers";
import { ensureCreds, login, uniqueName } from "./harness";

ensureCreds();

test("renter and room create/delete round-trip", async ({ page }) => {
	await login(page);
	const location = uniqueName("Loc");
	const building = uniqueName("Bld");
	const renter = uniqueName("R");
	const room = uniqueName("K");
	await createLocation(page, location);
	await createBuilding(page, location, building);
	await createRenter(page, renter);
	await createRoom(page, { building, name: room, rent: "500000" });

	// delete room via UI
	const roomRow = page.locator("tbody tr", { hasText: room });
	await roomRow.locator('button[aria-label="Delete room"]').click();
	await expect(page.getByText(room)).toHaveCount(0);

	// delete renter via UI
	await page.goto("/renters");
	const renterRow = page.locator("tbody tr", { hasText: renter });
	await renterRow.locator('button[title="Delete"]').click();
	await page.locator("[data-slot=dialog-content] button", { hasText: /^Delete$/ }).click();
	await expect(page.getByText(renter)).toHaveCount(0);
});
