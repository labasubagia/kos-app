export type CsvCell = string | number | null | undefined;

export function toCsv(rows: CsvCell[][]): string {
	const body = rows
		.map((row) =>
			row
				.map((cell) => {
					const s = cell == null ? "" : String(cell);
					return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
				})
				.join(","),
		)
		.join("\n");
	return `${body}\n`;
}

export function downloadCsv(filename: string, csv: string): void {
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

export function todayStamp(): string {
	return new Date().toISOString().slice(0, 10).replace(/-/g, "");
}
