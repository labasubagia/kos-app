<script lang="ts">
	import { onMount } from "svelte";
	import { supabase } from "$lib/supabase";
	import * as Table from "$lib/components/ui/table";
	import * as Popover from "$lib/components/ui/popover";
	import * as Select from "$lib/components/ui/select";
	import { CalendarDate } from "@internationalized/date";
	import { Button } from "$lib/components/ui/button";
	import { Badge } from "$lib/components/ui/badge";
	import * as Dialog from "$lib/components/ui/dialog";
	import { Trash2 } from "@lucide/svelte";
	import { toast } from "svelte-sonner";
	import { balanceOf, formatIDR, isWithinStayWindow, sortBills, totalPaid } from "$lib/logic/bills";

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
	let constBill = $state<Bill | null>(null);
	let genContract = $state<string>("");
	let genContracts = $state<{ id: string; label: string }[]>([]);
	let deleting = $state(false);
	const now = new Date();
	let calDate = $state(new CalendarDate(now.getFullYear(), now.getMonth() + 1, 1));
	let gridYear = $state(now.getFullYear());
	let open = $state(false);
	const selectedMonth = $derived(`${calDate.year}-${String(calDate.month).padStart(2, "0")}`);
	const months = Array.from({ length: 12 }, (_, i) => i + 1);
	function chooseMonth(m: number) {
		calDate = new CalendarDate(gridYear, m, 1);
		open = false;
		load();
	}

	async function load() {
		loading = true;
		const [{ data }, { data: cs }] = await Promise.all([
			supabase
				.from("bills")
				.select("*, payments(amount), contracts!inner(rooms(name), renters(name))")
				.eq("period", selectedMonth)
				.order("due_date", { ascending: true }),
			supabase.from("contracts").select("id, renters(name), rooms(name)").eq("active", true),
		]);
		bills = (data ?? []) as Bill[];
		genContracts = (((cs ?? []) as unknown) as { id: string; renters: { name: string }; rooms: { name: string } }[]).map((c) => ({
			id: c.id,
			label: `${c.renters.name} — ${c.rooms.name}`,
		}));
		loading = false;
	}

	onMount(load);

	const sortedBills = $derived(sortBills(bills));

	async function generate(period: string) {
		const { data: cs } = await supabase.from("contracts").select("id, start_date, end_date").eq("active", true);
		const candidates = (genContract ? ((cs ?? []) as { id: string; start_date: string; end_date: string | null }[]).filter((c) => c.id === genContract) : (cs ?? [])) as { start_date: string; end_date: string | null }[];
		const covered = candidates.some((c) => isWithinStayWindow(period, c.start_date, c.end_date));
		if (!covered) {
			toast.error(genContract ? `Selected contract does not cover ${period}` : `No active contract covers ${period}`);
			return;
		}
		generating = true;
		const { data, error } = await supabase.rpc("generate_bills", genContract ? { p_period: period, p_contract_id: genContract } : { p_period: period });
		generating = false;
		if (error) {
			toast.error(error.message);
			return;
		}
		if (data === 0) {
			toast.message("No bills created — month outside contract stay or already billed.");
		} else {
			toast.success(`Generated ${data} bill${data === 1 ? "" : "s"}`);
		}
		await load();
	}

	async function removeBill() {
		if (!constBill) return;
		deleting = true;
		const { error } = await supabase.from("bills").delete().eq("id", constBill.id);
		deleting = false;
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success(`Deleted bill for ${constBill.period}`);
		constBill = null;
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
			<Popover.Root bind:open>
				<Popover.Trigger class="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring data-[state=open]:bg-accent">
					{selectedMonth}
				</Popover.Trigger>
				<Popover.Content align="start" class="w-auto p-3">
					<div class="flex items-center justify-between">
						<Button size="sm" variant="ghost" onclick={() => (gridYear -= 1)} aria-label="Previous year">‹</Button>
						<span class="text-sm font-medium">{gridYear}</span>
						<Button size="sm" variant="ghost" onclick={() => (gridYear += 1)} aria-label="Next year">›</Button>
					</div>
					<div class="mt-2 grid grid-cols-3 gap-1">
						{#each months as m}
							<Button size="sm" variant={m === calDate.month ? "default" : "ghost"} class="h-8" onclick={() => chooseMonth(m)}>{String(m).padStart(2, "0")}</Button>
						{/each}
					</div>
				</Popover.Content>
			</Popover.Root>
			<Select.Root type="single" bind:value={genContract}>
				<Select.Trigger class="h-9 w-56">
					{genContract ? genContracts.find((c) => c.id === genContract)?.label ?? "All contracts" : "All contracts"}
				</Select.Trigger>
				<Select.Content>
					{#each genContracts as gc}
						<Select.Item value={gc.id}>{gc.label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
			<Button onclick={() => generate(selectedMonth)} disabled={generating || !selectedMonth}>{generating ? "Generating…" : `Generate ${selectedMonth}${genContract ? " for selected" : ""}`}</Button>
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
					<Table.Head class="text-right">Actions</Table.Head>
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
							<Table.Cell class="text-right">
								<Button size="sm" variant="ghost" aria-label={`Delete bill ${b.period}`} onclick={() => (constBill = b)}>
									<Trash2 class="h-4 w-4" />
								</Button>
							</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row>
						<Table.Cell colspan={9} class="py-8 text-center text-muted-foreground">No bills yet for {selectedMonth}</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	<Dialog.Root open={constBill !== null} onOpenChange={(o) => { if (!o) constBill = null; }}>
		<Dialog.Content class="sm:max-w-sm">
			<Dialog.Header>
				<Dialog.Title>Delete bill?</Dialog.Title>
				<Dialog.Description>Delete bill for {constBill?.period}? Its payments will also be removed.</Dialog.Description>
			</Dialog.Header>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (constBill = null)}>Cancel</Button>
				<Button onclick={removeBill} disabled={deleting}>{deleting ? "Deleting…" : "Delete"}</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
	</div>
</div>
