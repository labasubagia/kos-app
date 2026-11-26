<script lang="ts">
	import { onMount } from "svelte";
	import { supabase } from "$lib/supabase";
	import * as Card from "$lib/components/ui/card";
	import * as Table from "$lib/components/ui/table";
	import { Button } from "$lib/components/ui/button";
	import { Badge } from "$lib/components/ui/badge";
	import { toast } from "svelte-sonner";

	type Bill = {
		id: string;
		period: string;
		amount: number;
		due_date: string;
		status: "unpaid" | "partial" | "paid";
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
	const idr = (n: number) => n.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

	async function load() {
		loading = true;
		const { data } = await supabase
			.from("bills")
			.select("*, contracts!inner(rooms(name), renters(name))")
			.order("period", { ascending: false })
			.order("due_date", { ascending: true });
		bills = (data ?? []) as Bill[];
		loading = false;
	}

	onMount(load);

	async function generate() {
		generating = true;
		const { data, error } = await supabase.rpc("generate_bills");
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
			<h1 class="text-2xl font-semibold">Bills</h1>
			<p class="text-sm text-muted-foreground">Monthly bills per contract</p>
		</div>
		<Button onclick={generate} disabled={generating}>{generating ? "Generating…" : "Generate this month"}</Button>
	</div>

	<Card.Root>
		<Card.Content class="p-0">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Period</Table.Head>
						<Table.Head>Renter</Table.Head>
						<Table.Head>Room</Table.Head>
						<Table.Head>Due</Table.Head>
						<Table.Head class="text-right">Amount</Table.Head>
						<Table.Head>Status</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each bills as b (b.id)}
						<Table.Row>
							<Table.Cell class="font-mono">{b.period}</Table.Cell>
							<Table.Cell>{b.contracts.renters.name}</Table.Cell>
							<Table.Cell>{b.contracts.rooms.name}</Table.Cell>
							<Table.Cell>{b.due_date}</Table.Cell>
							<Table.Cell class="text-right">{idr(b.amount)}</Table.Cell>
							<Table.Cell>
								<Badge variant={statusVariant[b.status]} class="capitalize">{b.status}</Badge>
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row>
							<Table.Cell colspan={6} class="py-8 text-center text-muted-foreground">No bills yet — generate this month</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</Card.Content>
	</Card.Root>
</div>
