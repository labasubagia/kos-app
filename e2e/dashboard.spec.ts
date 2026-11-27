import { test, expect } from "@playwright/test";
import { cleanupArtifacts, client, hasCreds, login, uniqueName } from "./harness";
import {
	checkInContract,
	createBuilding,
	createLocation,
	createRenter,
	createRoom,
	generateBills,
} from "./helpers";

test.skip(!hasCreds(), "E2E credentials not set");

test("dashboard lists arrears with outstanding balance and empty rooms", async ({ page }) => {
	test.setTimeout(120_000);
	const location = uniqueName("Loc");
	const building = uniqueName("Bld");
	const roomOcc = uniqueName("RmOcc");
	const roomFree = uniqueName("RmFree");
	const renter = uniqueName("Rnt");
	const rent = "750000";

	await login(page);
	await createLocation(page, location);
	await createBuilding(page, location, building);
	await createRoom(page, { building, name: roomOcc, rent });
	await createRoom(page, { building, name: roomFree, rent });
	await createRenter(page, renter);
	await checkInContract(page, { renter, room: roomOcc, rent });
	await generateBills(page);

	await page.goto("/dashboard");

	// arrears card shows the unpaid renter with outstanding = full bill amount
	const arrears = page.locator("[data-slot=card]", { hasText: "Arrears" });
	const arrearsRow = arrears.locator("li", { hasText: renter });
	await expect(arrearsRow).toBeVisible();
	await expect(arrearsRow.getByText(Number(rent).toLocaleString("id-ID"))).toBeVisible();

	// empty rooms list shows the free room (occupied room is not listed)
	await expect(page.getByText(`${building} · ${roomFree}`)).toBeVisible();

	await cleanupArtifacts(await client(), renter, roomOcc);
});
