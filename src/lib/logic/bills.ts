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
