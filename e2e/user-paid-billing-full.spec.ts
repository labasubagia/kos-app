import { test, expect } from "@playwright/test";
import { cleanupArtifacts, client, hasCreds, login, uniqueName } from "./harness";
import {
	expectBillStatus,
	generateBillsApi,
	recordPayment,
	seedFixtures,
} from "./helpers";

test.skip(!hasCreds(), "E2E credentials not set");

const setupBilledTenant = async (page: import("@playwright/test").Page) => {
	const room = uniqueName("Rm");
	const renter = uniqueName("Rnt");
	const c = await client();
	const rent = "850000";
	await login(page);
	await seedFixtures(c, {
		location: uniqueName("Loc"),
		building: uniqueName("Bld"),
		room,
		renter,
		rent,
	});
	await generateBillsApi(c);
	return { renter, room };
};

test("positive: paying exactly the bill amount → paid", async ({ page }) => {
	test.setTimeout(120_000);
	const { renter, room } = await setupBilledTenant(page);

	await recordPayment(page, `${renter} — ${room}`, "850000");
	await expect(page.getByText("Payment recorded")).toBeVisible();
	await expectBillStatus(page, renter, "paid");

	await cleanupArtifacts(await client(), renter, room);
});

test("negative: paying more than the bill amount is rejected atomically", async ({ page }) => {
	test.setTimeout(120_000);
	const { renter, room } = await setupBilledTenant(page);

	await recordPayment(page, `${renter} — ${room}`, "900000"); // bill is 850k
	await expect(page.getByText(/overpayment/)).toBeVisible();

	// atomic rejection: nothing applied, bill stays unpaid
	await expectBillStatus(page, renter, "unpaid");

	await cleanupArtifacts(await client(), renter, room);
});
