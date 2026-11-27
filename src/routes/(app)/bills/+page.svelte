<script lang="ts">
	import { onMount } from "svelte";
	import { supabase } from "$lib/supabase";
	import * as Table from "$lib/components/ui/table";
	import * as Popover from "$lib/components/ui/popover";
	import { Calendar } from "$lib/components/ui/calendar";
	import { CalendarDate, type DateValue } from "@internationalized/date";
	import { Button } from "$lib/components/ui/button";
	import { Badge } from "$lib/components/ui/badge";
	import { toast } from "svelte-sonner";
	import { balanceOf, formatIDR, sortBills, totalPaid } from "$lib/logic/bills";

	type Bill = {
		id: string;
		period: string;
		amount: number;
		due_date: string;
		status: "unpaid" | "partial" | "paid";
		payments: { amount: number }[] | null;
		contracts: {
			start_date: string;
			end_date: string | null;
			active: boolean;
			rooms: { name: string };
			renters: { name: string };
		};
	};

	const statusVariant = { unpaid: "destructive", partial: "secondary", paid: "default" } as const;

	let bills = $state<Bill[]>([]);
	let loading = $state(true);
	let generating = $state(false);
	const now = new Date();
	let calDate = $state(new CalendarDate(now.getFullYear(), now.getMonth() + 1, 1));
	const selectedMonth = $derived(`${calDate.year}-${String(calDate.month).padStart(2, "0")}`);
	function chooseMonth(d: DateValue | undefined) {
		if (d) calDate = new CalendarDate(d.year, d.month, 1);
		load();
	}

	async function load() {
		loading = true;
		const { data } = await supabase
			.from("bills")
			.select("*, payments(amount), contracts!inner(rooms(name), renters(name))")
			.eq("period", selectedMonth)
			.order("due_date", { ascending: true });
		bills = (data ?? []) as Bill[];
		loading = false;
	}

	onMount(load);

	const sortedBills = $derived(sortBills(bills));

	async function generate(period: string) {
		generating = true;
		const { data, error } = await supabase.rpc("generate_bills", { p_period: period });
		generating = false;
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success(`Generated ${data} bill${data === 1 ? "" : "s"}`);
		await load();
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold">Bills</h1>
			<p class="text-sm text-muted-foreground">Monthly bills per contract</p>
		</div>
		<div class="flex items-center gap-3">
			<Popover.Root>
				<Popover.Trigger class="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring data-[state=open]:bg-accent">
					{selectedMonth}
				</Popover.Trigger>
				<Popover.Content align="start" class="w-auto p-0">
					<Calendar type="single" value={calDate} onValueChange={chooseMonth} captionLayout="dropdown" />
				</Popover.Content>
			</Popover.Root>
			<Button onclick={() => generate(selectedMonth)} disabled={generating || !selectedMonth}>{generating ? "Generating…" : `Generate ${selectedMonth}`}</Button>
		</div>
	</div>

	<div class="rounded-lg border">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Period</Table.Head>
					<Table.Head>Renter</Table.Head>
					<Table.Head>Room</Table.Head>
					<Table.Head>Due</Table.Head>
					<Table.Head class="text-right">Amount</Table.Head>
					<Table.Head class="text-right">Paid</Table.Head>
					<Table.Head class="text-right">Balance</Table.Head>
					<Table.Head>Status</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each sortedBills as b (b.id)}
					<Table.Row>
						<Table.Cell class="font-mono">{b.period}</Table.Cell>
						<Table.Cell>{b.contracts.renters.name}</Table.Cell>
						<Table.Cell>{b.contracts.rooms.name}</Table.Cell>
						<Table.Cell>{b.due_date}</Table.Cell>
						<Table.Cell class="text-right">{formatIDR(b.amount)}</Table.Cell>
						<Table.Cell class="text-right">{formatIDR(totalPaid(b.payments))}</Table.Cell>
						<Table.Cell class="text-right">{formatIDR(balanceOf(b.amount, b.payments))}</Table.Cell>
						<Table.Cell>
							<Badge variant={statusVariant[b.status]} class="capitalize">{b.status}</Badge>
						</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={8} class="py-8 text-center text-muted-foreground">No bills yet for {selectedMonth}</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</div>
</div>
