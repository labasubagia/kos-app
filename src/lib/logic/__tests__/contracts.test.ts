import { describe, expect, it } from "vitest";
import { depositRefund, checkoutBalance, isValidContractDates } from "../contracts";

describe("depositRefund", () => {
	it("refunds deposit minus arrears and deductions", () => {
		expect(depositRefund(1000, 200, 50)).toBe(750);
	});
	it("floors at zero", () => {
		expect(depositRefund(1000, 1200, 0)).toBe(0);
	});
});

describe("checkoutBalance", () => {
	it("positive when renter owes", () => {
		expect(checkoutBalance(1000, 1200, 0)).toBe(200);
	});
	it("negative when refund due", () => {
		expect(checkoutBalance(1000, 200, 50)).toBe(-750);
	});
});

describe("isValidContractDates", () => {
	it("accepts open-ended", () => {
		expect(isValidContractDates("2026-01-01", null)).toBe(true);
	});
	it("rejects end before start", () => {
		expect(isValidContractDates("2026-05-01", "2026-04-01")).toBe(false);
	});
});
