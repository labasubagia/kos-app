import { describe, expect, it } from "vitest";
import { billAmount, isPastGrace, periodKey, nextPeriod, totalPaid, balanceOf, formatIDR, sortBills, isWithinStayWindow } from "../bills";

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

describe("isWithinStayWindow", () => {
	const start = "2026-11-01";
	it("allows the check-in month", () => {
		expect(isWithinStayWindow("2026-11", start, null)).toBe(true);
	});
	it("allows months inside the stay", () => {
		expect(isWithinStayWindow("2026-12", start, "2027-02-28")).toBe(true);
		expect(isWithinStayWindow("2027-01", start, "2027-02-28")).toBe(true);
		expect(isWithinStayWindow("2027-02", start, "2027-02-28")).toBe(true);
	});
	it("blocks months before check-in", () => {
		expect(isWithinStayWindow("2026-10", start, null)).toBe(false);
		expect(isWithinStayWindow("2025-12", start, null)).toBe(false);
	});
	it("blocks months after check-out", () => {
		expect(isWithinStayWindow("2027-03", start, "2027-02-28")).toBe(false);
	});
	it("open-ended contract (null end) has no upper bound", () => {
		expect(isWithinStayWindow("2030-06", start, null)).toBe(true);
	});
	it("Nov check-in billable in Nov; Dec check-in not", () => {
		expect(isWithinStayWindow("2026-11", "2026-11-01", null)).toBe(true);
		expect(isWithinStayWindow("2026-11", "2026-12-01", null)).toBe(false);
	});
});

describe("payment sums", () => {
	it("totalPaid sums amounts, treats null as 0", () => {
		expect(totalPaid([{ amount: 500 }, { amount: 50 }])).toBe(550);
		expect(totalPaid(null)).toBe(0);
		expect(totalPaid([])).toBe(0);
	});
	it("balanceOf subtracts paid from amount", () => {
		expect(balanceOf(500, [{ amount: 200 }])).toBe(300);
		expect(balanceOf(500, null)).toBe(500);
	});
	it("formatIDR renders IDR without decimals", () => {
		expect(formatIDR(550000)).toContain("550.000");
	});
});

describe("sortBills", () => {
	it("sorts unpaid above paid/partial, then by due_date", () => {
		const paid = { id: "paid", status: "paid" as const, due_date: "2026-01-10" };
		const unpaidLate = { id: "unpaid-late", status: "unpaid" as const, due_date: "2026-01-20" };
		const unpaidEarly = { id: "unpaid-early", status: "unpaid" as const, due_date: "2026-01-05" };
		const partial = { id: "partial", status: "partial" as const, due_date: "2026-01-01" };
		expect(sortBills([paid, partial, unpaidLate, unpaidEarly]).map((b) => b.id)).toEqual([
			"unpaid-early",
			"unpaid-late",
			"partial",
			"paid",
		]);
	});
});
