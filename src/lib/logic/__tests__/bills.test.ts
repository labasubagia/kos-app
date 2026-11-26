import { describe, expect, it } from "vitest";
import { billAmount, isPastGrace, periodKey, nextPeriod } from "../bills";

describe("billAmount", () => {
	it("rent only when previous period paid or within grace", () => {
		expect(billAmount({ monthlyRent: 500, lateFee: 50, previousPeriodUnpaid: false, previousPeriodPastGrace: false, graceDays: 3, daysLate: 0 })).toBe(500);
		expect(billAmount({ monthlyRent: 500, lateFee: 50, previousPeriodUnpaid: true, previousPeriodPastGrace: false, graceDays: 7, daysLate: 3 })).toBe(500);
	});
	it("adds late fee when previous unpaid past grace", () => {
		expect(billAmount({ monthlyRent: 500, lateFee: 50, previousPeriodUnpaid: true, previousPeriodPastGrace: true, graceDays: 3, daysLate: 10 })).toBe(550);
	});
});

describe("isPastGrace", () => {
	it("strictly after grace days", () => {
		expect(isPastGrace(4, 3)).toBe(true);
		expect(isPastGrace(3, 3)).toBe(false);
	});
});

describe("period helpers", () => {
	it("formats YYYY-MM", () => {
		expect(periodKey(new Date(2026, 0, 15))).toBe("2026-01");
	});
	it("advances month (December wraps year)", () => {
		expect(nextPeriod("2026-12")).toBe("2027-01");
		expect(nextPeriod("2026-03")).toBe("2026-04");
	});
});
