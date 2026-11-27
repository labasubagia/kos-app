// Bill amount computation per docs/02-business-rules.md.

export interface BillInput {
	monthlyRent: number;
	lateFee: number; // per period
	previousPeriodUnpaid: boolean;
	previousPeriodPastGrace: boolean;
	graceDays: number;
	daysLate: number; // days since previous due_date + grace
}

/**
 * A period (YYYY-MM) is billable for a contract only when it falls inside the
 * stay window: >= check-in month and <= check-out month (or open-ended).
 * Mirrors the SQL guard in generate_bills.
 */
export function isWithinStayWindow(period: string, startDate: string, endDate: string | null): boolean {
	return period >= startDate.slice(0, 7) && (endDate === null || period <= endDate.slice(0, 7));
}

/** Amount = rent + late fee if prior period unpaid past its grace window. */
export function billAmount(input: BillInput): number {
	const late = input.previousPeriodUnpaid && input.previousPeriodPastGrace ? input.lateFee : 0;
	return input.monthlyRent + late;
}

export function isPastGrace(daysLate: number, graceDays: number): boolean {
	return daysLate > graceDays;
}

/** period key YYYY-MM from a Date. */
export function periodKey(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, "0");
	return `${y}-${m}`;
}

/** Next month's period key. */
export function nextPeriod(period: string): string {
	const [y, m] = period.split("-").map(Number);
	const d = new Date(y, m, 1); // month index m == next month
	return periodKey(d);
}

/** Total paid across payments. */
export function totalPaid(payments: { amount: number }[] | null): number {
	return payments?.reduce((s, p) => s + Number(p.amount), 0) ?? 0;
}

/** Remaining balance = bill amount minus total paid. */
export function balanceOf(amount: number, payments: { amount: number }[] | null): number {
	return amount - totalPaid(payments);
}

/** Format as IDR currency, no decimals. */
export function formatIDR(n: number): string {
	return n.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
}

export type BillStatus = "unpaid" | "partial" | "paid";

const statusWeight: Record<BillStatus, number> = { unpaid: 0, partial: 1, paid: 2 };

/** Unpaid first (dunning), then by due date. */
export function sortBills<T extends { status: BillStatus; due_date: string }>(bills: T[]): T[] {
	return [...bills].toSorted((a, b) => {
		if (statusWeight[a.status] !== statusWeight[b.status]) return statusWeight[a.status] - statusWeight[b.status];
		return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
	});
}
