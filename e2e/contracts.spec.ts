import { test, expect } from "@playwright/test";
import { cleanupArtifacts, ensureCreds, fillByLabel, login, selectOption, uniqueName } from "./harness";
import { dbClient } from "../tests/support/db";
import { createBuilding, createLocation, createRenter, createRoom, pickDate } from "./helpers";

ensureCreds();

const setup = async (page: import("@playwright/test").Page) => {
	const location = uniqueName("Loc");
	const building = uniqueName("Bld");
	const room = uniqueName("Rm");
	const renter = uniqueName("Rnt");
	await login(page);
	await createLocation(page, location);
	await createBuilding(page, location, building);
	await createRoom(page, { building, name: room, rent: "500000" });
	await createRenter(page, renter);
	return { room, renter };
};

test("selects render labels, not uuids, in the check-in dialog", async ({ page }) => {
	test.setTimeout(120_000);
	const { room, renter } = await setup(page);

	const { data: rows } = await (await dbClient())
		.from("rooms")
		.select("name, buildings(locations(name), name)")
		.eq("name", room)
		.limit(1);
	const r = rows?.[0];
	if (!r?.buildings) throw new Error("room has no building/location");
	const roomLabel = `${r.buildings.locations.name} – ${r.buildings.name} – ${r.name}`;

	await page.goto("/contracts");
	await page.getByRole("button", { name: "Check-in" }).click();
	const dialog = page.locator("[data-slot=dialog-content]");
	const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-/;

	await selectOption(page, "Renter", renter);
	const renterTrigger = dialog.locator("[data-slot=select-trigger]", { hasText: renter }).first();
	await expect(renterTrigger).toHaveText(renter);
	await expect(renterTrigger).not.toHaveText(uuid);

	await selectOption(page, "Room", room);
	const roomTrigger = dialog.locator("[data-slot=select-trigger]", { hasText: room }).first();
	await expect(roomTrigger).toContainText(roomLabel);
	await expect(roomTrigger).not.toHaveText(uuid);

	await cleanupArtifacts(await dbClient(), renter, room);
});

test("check-in uses a calendar date picker fed end-to-end", async ({ page }) => {
	test.setTimeout(120_000);
	const { room, renter } = await setup(page);

	await page.goto("/contracts");
	await page.getByRole("button", { name: "Check-in" }).click();
	const dialog = page.locator("[data-slot=dialog-content]");
	const triggers = dialog.locator("[data-slot=popover-trigger]");
	const startTrigger = triggers.nth(0);
	await expect(startTrigger).toBeVisible();

	const start = new Date();
	await pickDate(page, startTrigger, start);
	await expect(startTrigger).not.toContainText("Select");

	await selectOption(page, "Renter", renter);
	await selectOption(page, "Room", room);
	await fillByLabel(page, "Monthly rent", "500000");
	await dialog.getByRole("button", { name: "Check in" }).click();

	const row = page.locator("tbody tr", { hasText: renter });
	await expect(row.getByText("Active")).toBeVisible();
	const iso = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, "0")}-${String(start.getDate()).padStart(2, "0")}`;
	await expect(row).toContainText(iso);

	await cleanupArtifacts(await dbClient(), renter, room);
});
