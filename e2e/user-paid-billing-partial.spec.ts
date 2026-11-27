import { test, expect } from "@playwright/test";
import { cleanupArtifacts, ensureCreds, login, uniqueName } from "./harness";
import { dbClient } from "../tests/support/db";
import {
	expectBillStatus,
	generateBillsApi,
	recordPayment,
	seedFixtures,
} from "./helpers";

ensureCreds();

test("partial pay → overpayment rejected (stays partial) → completes with exact remainder", async ({ page }) => {
	test.setTimeout(120_000);
	const room = uniqueName("Rm");
	const renter = uniqueName("Rnt");
	const c = await dbClient();
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

	// positive: partial installment → status `partial`
	await recordPayment(page, `${renter} — ${room}`, "400000");
	await expect(page.getByText("Payment recorded")).toBeVisible();
	await expectBillStatus(page, renter, "partial");

	// negative: trying to exceed the remaining balance (400k + 600k > 850k) is
	// rejected atomically — status stays `partial`
	await recordPayment(page, `${renter} — ${room}`, "600000");
	await expect(page.getByText(/overpayment/)).toBeVisible();
	await expectBillStatus(page, renter, "partial");

	// positive: finish with the exact remainder
	await recordPayment(page, `${renter} — ${room}`, "450000");
	await expect(page.getByText("Payment recorded")).toBeVisible();
	await expectBillStatus(page, renter, "paid");

	await cleanupArtifacts(await dbClient(), renter, room);
});
