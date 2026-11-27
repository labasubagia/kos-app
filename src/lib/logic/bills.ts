// Bill amount computation per docs/02-business-rules.md.

export interface BillInput {
	monthlyRent: number;
	lateFee: number; // per period
	previousPeriodUnpaid: boolean;
	previousPeriodPastGrace: boolean;
	graceDays: number;
	daysLate: number; // days since previous due_date + grace
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
