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

test("user pays partially, then overpayment is rejected; completes to paid", async ({ page }) => {
	test.setTimeout(120_000);
	const location = uniqueName("Loc");
	const building = uniqueName("Bld");
	const room = uniqueName("Rm");
	const renter = uniqueName("Rnt");
	const rent = "850000";

	await login(page);
	await createLocation(page, location);
	await createBuilding(page, location, building);
	await createRoom(page, { building, name: room, rent });
	await createRenter(page, renter);
	await checkInContract(page, { renter, room, rent });
	await generateBills(page);

	// partial installment → status `partial`
	await recordPayment(page, `${renter} — ${room}`, "400000");
	await expect(page.getByText("Payment recorded")).toBeVisible();
	await expectBillStatus(page, renter, "partial");

	// attempting to exceed the remaining balance (400k + 600k > 850k) → rejected
	await recordPayment(page, `${renter} — ${room}`, "600000");
	await expect(page.getByText(/overpayment/)).toBeVisible();

	// sum of installments never exceeded the bill: ends paid at exactly 850k
	await expectBillStatus(page, renter, "paid");

	await cleanupArtifacts(await client(), renter, room);
});
