<script lang="ts">
	import { onMount } from "svelte";
	import { supabase } from "$lib/supabase";
	import * as Card from "$lib/components/ui/card";
	import { Badge } from "$lib/components/ui/badge";
	import { Skeleton } from "$lib/components/ui/skeleton";
	import { BedDouble, Wallet, AlertTriangle, CalendarClock } from "@lucide/svelte";

	type Room = {
		id: string;
		status: "available" | "reserved" | "occupied" | "maintenance";
		buildings: { name: string; locations: { name: string } | null } | null;
	};

	type Bill = {
		id: string;
		period: string;
		amount: number;
		status: "unpaid" | "partial" | "paid";
		contracts: { rooms: { name: string }; renters: { name: string } };
	};

	type Contract = {
		id: string;
		end_date: string | null;
		rooms: { name: string };
		renters: { name: string };
	};

	let loading = $state(true);
	let rooms = $state<Room[]>([]);
	let monthIncome = $state(0);
	let bills = $state<Bill[]>([]);
	let contracts = $state<Contract[]>([]);

	const idr = (n: number) =>
		n.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

	const now = new Date();
	const monthLabel = now.toLocaleString("id-ID", { month: "long", year: "numeric" });
	const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
	const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
		new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
	).padStart(2, "0")}`;

	onMount(async () => {
		const [r, p, b, c] = await Promise.all([
			supabase.from("rooms").select("id, status, buildings(name, locations(name))"),
			supabase
				.from("payments")
				.select("amount")
				.gte("date", monthStart)
				.lte("date", monthEnd),
			supabase
				.from("bills")
				.select("id, period, amount, status, contracts!inner(rooms(name), renters(name))")
				.neq("status", "paid"),
			supabase
				.from("contracts")
				.select("id, end_date, rooms(name), renters(name)")
				.eq("active", true),
		]);
		rooms = (r.data ?? []) as unknown as Room[];
		monthIncome = (p.data ?? []).reduce((sum: number, row: { amount: number }) => sum + Number(row.amount), 0);
		bills = (b.data ?? []) as unknown as Bill[];
		contracts = (c.data ?? []) as unknown as Contract[];
		loading = false;
	});

	const totalRooms = $derived(rooms.length);
	const occupiedRooms = $derived(rooms.filter((r) => r.status === "occupied").length);
	const occupancyPct = $derived(totalRooms === 0 ? 0 : Math.round((occupiedRooms / totalRooms) * 100));

	const locationBreakdown = $derived((() => {
		const map = new Map<string, { occupied: number; total: number }>();
		for (const room of rooms) {
			const loc = room.buildings?.locations?.name;
			if (!loc) continue;
			const e = map.get(loc) ?? { occupied: 0, total: 0 };
			e.total += 1;
			if (room.status === "occupied") e.occupied += 1;
			map.set(loc, e);
		}
		return [...map.entries()].toSorted((a, b) => a[0].localeCompare(b[0]));
	})());

	const buildingBreakdown = $derived((() => {
		const map = new Map<string, { occupied: number; total: number }>();
		for (const room of rooms) {
			const bld = room.buildings?.name;
			if (!bld) continue;
			const e = map.get(bld) ?? { occupied: 0, total: 0 };
			e.total += 1;
			if (room.status === "occupied") e.occupied += 1;
			map.set(bld, e);
		}
		return [...map.entries()].toSorted((a, b) => a[0].localeCompare(b[0]));
	})());

	const totalOutstanding = $derived(bills.reduce((sum, b) => sum + Number(b.amount), 0));

	function expiringFlag(end: string | null): 30 | 60 | "indefinite" | null {
		if (!end) return "indefinite";
		const days = Math.ceil((new Date(end).getTime() - now.getTime()) / 86400000);
		if (days <= 30) return 30;
		if (days <= 60) return 60;
		return null;
	}

	const flagVariant = { 30: "destructive", 60: "secondary", indefinite: "outline" } as const;
	const flagLabel = { 30: "30d", 60: "60d", indefinite: "indefinite" } as const;

	const sortedContracts = $derived(
		[...contracts].toSorted((a, b) => {
			if (!a.end_date && !b.end_date) return 0;
			if (!a.end_date) return 1;
			if (!b.end_date) return -1;
			return new Date(a.end_date).getTime() - new Date(b.end_date).getTime();
		})
	);
</script>

<svelte:head><title>Dashboard</title></svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-bold">Dashboard</h1>
		<p class="text-sm text-muted-foreground">Overview of rooms, income, arrears, and contracts</p>
	</div>

	<div class="grid gap-6 md:grid-cols-2">
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2"><BedDouble class="h-4 w-4" /> Occupancy</Card.Title>
			</Card.Header>
			<Card.Content>
				{#if loading}
					<Skeleton class="h-8 w-2/3" /><Skeleton class="mt-2 h-4 w-1/3" />
				{:else}
					<div class="flex items-baseline gap-2">
						<span class="text-3xl font-bold">{occupancyPct}%</span>
						<span class="text-sm text-muted-foreground">{occupiedRooms} / {totalRooms} rooms occupied</span>
					</div>
					{#if totalRooms > 0}
						<div class="mt-4 h-2 w-full overflow-hidden rounded-full bg-muted">
							<div class="h-full bg-primary" style="width: {occupancyPct}%"></div>
						</div>
					{/if}
					<div class="mt-4 grid gap-4 sm:grid-cols-2">
						<div>
							<p class="text-xs font-medium text-muted-foreground">By location</p>
							{#if locationBreakdown.length === 0}
								<p class="mt-1 text-xs text-muted-foreground">No locations</p>
							{:else}
								<ul class="mt-1 space-y-1 text-sm">
									{#each locationBreakdown as [name, e] (name)}
										<li class="flex justify-between gap-2">
											<span class="truncate">{name}</span>
											<span class="shrink-0 text-muted-foreground">{e.occupied}/{e.total}</span>
										</li>
									{/each}
								</ul>
							{/if}
						</div>
						<div>
							<p class="text-xs font-medium text-muted-foreground">By building</p>
							{#if buildingBreakdown.length === 0}
								<p class="mt-1 text-xs text-muted-foreground">No buildings</p>
							{:else}
								<ul class="mt-1 space-y-1 text-sm">
									{#each buildingBreakdown as [name, e] (name)}
										<li class="flex justify-between gap-2">
											<span class="truncate">{name}</span>
											<span class="shrink-0 text-muted-foreground">{e.occupied}/{e.total}</span>
										</li>
									{/each}
								</ul>
							{/if}
						</div>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Monthly income -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2"><Wallet class="h-4 w-4" /> Monthly income</Card.Title>
			</Card.Header>
			<Card.Content>
				{#if loading}
					<Skeleton class="h-8 w-2/3" /><Skeleton class="mt-2 h-4 w-1/2" />
				{:else}
					<div class="text-3xl font-bold">{idr(monthIncome)}</div>
					<p class="mt-1 text-sm text-muted-foreground capitalize">{monthLabel}</p>
					{#if monthIncome === 0}
						<p class="mt-4 text-sm text-muted-foreground">No payments recorded this month.</p>
					{/if}
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Arrears -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2"><AlertTriangle class="h-4 w-4" /> Arrears</Card.Title>
			</Card.Header>
			<Card.Content>
				{#if loading}
					<Skeleton class="h-8 w-1/2" /><Skeleton class="mt-2 h-4 w-2/3" /><Skeleton class="mt-2 h-4 w-3/4" />
				{:else if bills.length === 0}
					<p class="text-sm text-muted-foreground">No outstanding bills. 🎉</p>
				{:else}
					<div class="flex items-baseline gap-2">
						<span class="text-2xl font-bold">{idr(totalOutstanding)}</span>
						<span class="text-sm text-muted-foreground">outstanding ({bills.length} {bills.length === 1 ? "bill" : "bills"})</span>
					</div>
					<ul class="mt-4 space-y-2 text-sm">
						{#each bills as b (b.id)}
							<li class="flex items-center justify-between gap-2">
								<div class="min-w-0">
									<p class="truncate font-medium">{b.contracts.renters.name}</p>
									<p class="truncate text-xs text-muted-foreground">{b.contracts.rooms.name} · {b.period}</p>
								</div>
								<span class="shrink-0 font-medium">{idr(Number(b.amount))}</span>
							</li>
						{/each}
					</ul>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Expiring contracts -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2"><CalendarClock class="h-4 w-4" /> Contracts</Card.Title>
			</Card.Header>
			<Card.Content>
				{#if loading}
					<Skeleton class="h-4 w-full" /><Skeleton class="mt-2 h-4 w-3/4" /><Skeleton class="mt-2 h-4 w-5/6" />
				{:else if contracts.length === 0}
					<p class="text-sm text-muted-foreground">No active contracts.</p>
				{:else}
					<ul class="space-y-2 text-sm">
						{#each sortedContracts as c (c.id)}
							<li class="flex items-center justify-between gap-2">
								<div class="min-w-0">
									<p class="truncate font-medium">{c.renters.name}</p>
									<p class="truncate text-xs text-muted-foreground">
										{c.rooms.name} · {c.end_date ?? "Indefinite"}
									</p>
								</div>
								{#if expiringFlag(c.end_date)}
									<Badge variant={flagVariant[expiringFlag(c.end_date)!]} class="shrink-0">
										{flagLabel[expiringFlag(c.end_date)!]}
									</Badge>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>
</div>
