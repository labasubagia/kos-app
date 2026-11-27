import { test, expect } from "@playwright/test";
import { cleanupArtifacts, client, hasCreds, login, uniqueName } from "./harness";
import {
	checkInContract,
	createBuilding,
	createLocation,
	createRenter,
	createRoom,
	expectBillStatus,
	generateBills,
	recordPayment,
} from "./helpers";

test.skip(!hasCreds(), "E2E credentials not set");

test("user pays a bill in full: check-in → bill → pay full → paid", async ({ page }) => {
	test.setTimeout(120_000);
	const location = uniqueName("Loc");
	const building = uniqueName("Bld");
	const room = uniqueName("Rm");
	const renter = uniqueName("Rnt");
	const rent = "600000";

	await login(page);
	await createLocation(page, location);
	await createBuilding(page, location, building);
	await createRoom(page, { building, name: room, rent });
	await createRenter(page, renter);
	await checkInContract(page, { renter, room, rent });
	await generateBills(page);

	await recordPayment(page, `${renter} — ${room}`, rent);
	await expect(page.getByText("Payment recorded")).toBeVisible();
	await expectBillStatus(page, renter, "paid");

	await cleanupArtifacts(await client(), renter, room);
});
