import { test, expect } from "@playwright/test";
import { createBuilding, createLocation } from "./helpers";
import { ensureCreds, login, uniqueName } from "./harness";

ensureCreds();

test("building CRUD round-trip under a fresh location", async ({ page }) => {
	await login(page);
	const location = uniqueName("Loc");
	const name = uniqueName("B");
	await createLocation(page, location);
	await createBuilding(page, location, name);

	const row = page.locator("tbody tr", { hasText: name });
	await row.locator("button").nth(1).click();
	await expect(page.getByText(name)).toHaveCount(0);
});
