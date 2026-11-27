<script lang="ts">
	import { onMount } from "svelte";
	import { supabase } from "$lib/supabase";
	import { Download, Printer, Receipt } from "@lucide/svelte";
	import { downloadCsv, toCsv, todayStamp, type CsvCell } from "$lib/csv";
	import { tenant } from "$lib/stores/auth.svelte.ts";
	import { Separator } from "$lib/components/ui/separator";
	import DatePicker from "$lib/components/date-picker.svelte";
	import * as Table from "$lib/components/ui/table";
	import * as Dialog from "$lib/components/ui/dialog";
	import * as Input from "$lib/components/ui/input";
	import * as Label from "$lib/components/ui/label";
	import * as Select from "$lib/components/ui/select";
	import { Button } from "$lib/components/ui/button";
	import { toast } from "svelte-sonner";

	type Payment = {
		id: string;
		date: string;
		amount: number;
		method: "cash" | "transfer";
		notes: string | null;
		bills: { period: string; contracts: { rooms: { name: string }; renters: { name: string } } };
	};

	type ContractOption = {
		id: string;
		label: string;
		outstanding: number;
	};

	let payments = $state<Payment[]>([]);
	let contracts = $state<ContractOption[]>([]);
	let arrears = $state<{ renter: string; room: string; period: string; amount: number; status: string }[]>([]);
	let loading = $state(true);

	const idr = (n: number) => n.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

	async function load() {
		loading = true;
		const [p, c] = await Promise.all([
			supabase
				.from("payments")
				.select("*, bills!inner(period, contracts!inner(rooms(name), renters(name)))")
				.order("date", { ascending: false }),
		supabase
			.from("contracts")
			.select("id, rooms(name), renters(name), bills(amount, status, period)")
			.eq("active", true),
	]);
	payments = (p.data ?? []) as Payment[];
	const billRows = (c.data ?? []) as unknown as {
		id: string;
		rooms: { name: string };
		renters: { name: string };
		bills: { amount: number; status: string; period: string }[];
	}[];
	const opts = billRows.map((co) => {
		const outstanding = (co.bills ?? []).reduce((sum, b) => {
			return b.status === "paid" ? sum : sum + Number(b.amount);
		}, 0);
		const unpaidPeriods = (co.bills ?? [])
			.filter((b) => b.status !== "paid")
			.map((b) => b.period)
			.sort();
		return {
			id: co.id,
			label: `${co.renters.name} — ${co.rooms.name} (${unpaidPeriods.join(", ")})`,
			outstanding,
		};
	}).filter((o) => o.outstanding > 0).toSorted((a, b) => a.label.localeCompare(b.label));
	contracts = opts;
	arrears = billRows.flatMap((co) =>
		(co.bills ?? [])
			.filter((b) => b.status !== "paid")
			.map((b) => ({
				renter: co.renters.name,
				room: co.rooms.name,
				period: b.period,
				amount: Number(b.amount),
				status: b.status,
			})),
	);
	loading = false;
}

	onMount(load);

	// ---- record payment dialog ----
	let openPay = $state(false);
	let payContract = $state("");
	let payAmount = $state<number | null>(null);
	let payMethod = $state("cash");
	let payDate = $state("");
	let payNotes = $state("");
	let payBusy = $state(false);

	function openRecord() {
		payContract = "";
		payAmount = null;
		payMethod = "cash";
		payDate = "";
		payNotes = "";
		openPay = true;
	}

	async function submitPayment() {
		if (!payContract || !payAmount) {
			toast.error("Contract and amount are required");
			return;
		}
		if (!(Number(payAmount) > 0)) {
			toast.error("Amount must be greater than zero");
			return;
		}
		payBusy = true;
		const { error } = await supabase.rpc("record_payment", {
			p_contract_id: payContract,
			p_amount: Number(payAmount),
			p_method: payMethod,
			p_date: payDate || undefined,
			p_notes: payNotes || null,
		});
		payBusy = false;
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success("Payment recorded");
		openPay = false;
		await load();
	}
	function exportPaymentsCsv() {
		const rows: CsvCell[][] = [
			["date", "renter", "room", "period", "method", "amount"],
			...payments.map((p) => [
				p.date,
				p.bills.contracts.renters.name,
				p.bills.contracts.rooms.name,
				p.bills.period,
				p.method,
				p.amount,
			]),
		];
		downloadCsv(`payments-${todayStamp()}.csv`, toCsv(rows));
	}

	function exportArrearsCsv() {
		const rows: CsvCell[][] = [
			["renter", "room", "period", "amount", "status"],
			...arrears.map((a) => [a.renter, a.room, a.period, a.amount, a.status]),
		];
		downloadCsv(`arrears-${todayStamp()}.csv`, toCsv(rows));
	}

	let receiptPayment = $state<Payment | null>(null);

	function openReceipt(p: Payment) {
		receiptPayment = p;
	}
</script>

	<div class="space-y-6 print:hidden">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold">Payments</h1>
			<p class="text-sm text-muted-foreground">Record payments — applied FIFO to oldest bills</p>
		</div>
		<div class="flex gap-2">
			<Button variant="outline" onclick={exportPaymentsCsv}><Download class="h-4 w-4" /> Export CSV</Button>
			<Button variant="outline" onclick={exportArrearsCsv}>Arrears CSV</Button>
			<Button onclick={openRecord} disabled={contracts.length === 0}>Record payment</Button>
		</div>
	</div>

	<div class="rounded-lg border">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Date</Table.Head>
					<Table.Head>Renter</Table.Head>
					<Table.Head>Room</Table.Head>
					<Table.Head>Period</Table.Head>
					<Table.Head>Method</Table.Head>
					<Table.Head class="text-right">Amount</Table.Head>
					<Table.Head class="w-16"></Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each payments as pm (pm.id)}
					<Table.Row>
						<Table.Cell>{pm.date}</Table.Cell>
						<Table.Cell>{pm.bills.contracts.renters.name}</Table.Cell>
						<Table.Cell>{pm.bills.contracts.rooms.name}</Table.Cell>
						<Table.Cell class="font-mono">{pm.bills.period}</Table.Cell>
						<Table.Cell class="capitalize">{pm.method}</Table.Cell>
						<Table.Cell class="text-right">{idr(pm.amount)}</Table.Cell>
						<Table.Cell class="text-right">
							<Button variant="ghost" size="sm" onclick={() => openReceipt(pm)} title="Receipt">
								<Receipt class="h-4 w-4" />
							</Button>
						</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={7} class="py-8 text-center text-muted-foreground">No payments yet</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>

	<Dialog.Root bind:open={openPay}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Record payment</Dialog.Title>
				<Dialog.Description>Applied to the oldest unpaid bills first</Dialog.Description>
			</Dialog.Header>
			<div class="grid gap-4 py-4">
				<div class="grid gap-2">
					<Label.Root>Contract</Label.Root>
					<Select.Root type="single" bind:value={payContract}>
						<Select.Trigger class="w-full">
							{@const sel = contracts.find((x) => x.id === payContract)}
							{sel ? `${sel.label} — ${idr(sel.outstanding)}` : "Select contract with balance"}
						</Select.Trigger>
						<Select.Content>
							{#each contracts as c}
								<Select.Item value={c.id}>{c.label} — {idr(c.outstanding)}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div class="grid gap-2">
						<Label.Root>Amount (IDR)</Label.Root>
						<Input.Root type="number" min="0" bind:value={payAmount} placeholder="0" />
					</div>
					<div class="grid gap-2">
						<Label.Root>Method</Label.Root>
						<Select.Root type="single" bind:value={payMethod}>
							<Select.Trigger class="w-full"><Select.Value /></Select.Trigger>
							<Select.Content>
								<Select.Item value="cash">Cash</Select.Item>
								<Select.Item value="transfer">Transfer</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div class="grid gap-2">
						<Label.Root>Date</Label.Root>
						<DatePicker bind:value={payDate} placeholder="Select payment date" />
					</div>
					<div class="grid gap-2">
						<Label.Root>Notes (optional)</Label.Root>
						<Input.Root type="text" bind:value={payNotes} />
					</div>
				</div>
			</div>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (openPay = false)}>Cancel</Button>
				<Button onclick={submitPayment} disabled={payBusy}>{payBusy ? "Saving…" : "Record payment"}</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
	<Dialog.Root open={receiptPayment !== null} onOpenChange={(o) => { if (!o) receiptPayment = null; }}>
		<Dialog.Content class="sm:max-w-sm">
			<Dialog.Header>
				<Dialog.Title>Receipt</Dialog.Title>
			</Dialog.Header>
			{#if receiptPayment}
				<div class="space-y-3 py-2 text-sm">
					<div class="text-center">
						<div class="text-lg font-bold">{$tenant?.tenantName ?? "Kos App"}</div>
						<div class="text-muted-foreground">Payment receipt</div>
					</div>
					<Separator />
					<div class="flex justify-between"><span class="text-muted-foreground">Receipt #</span><span class="font-mono">{receiptPayment.id.slice(-6).toUpperCase()}</span></div>
					<div class="flex justify-between"><span class="text-muted-foreground">Renter</span><span>{receiptPayment.bills.contracts.renters.name}</span></div>
					<div class="flex justify-between"><span class="text-muted-foreground">Room</span><span>{receiptPayment.bills.contracts.rooms.name}</span></div>
					<div class="flex justify-between"><span class="text-muted-foreground">Period</span><span class="font-mono">{receiptPayment.bills.period}</span></div>
					<div class="flex justify-between"><span class="text-muted-foreground">Date</span><span>{receiptPayment.date}</span></div>
					<div class="flex justify-between"><span class="text-muted-foreground">Method</span><span class="capitalize">{receiptPayment.method}</span></div>
					<div class="flex justify-between border-t pt-2 text-base font-semibold"><span>Amount</span><span>{idr(receiptPayment.amount)}</span></div>
				</div>
			{/if}
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (receiptPayment = null)}>Close</Button>
				<Button onclick={() => window.print()}><Printer class="h-4 w-4" /> Print</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
</div>
