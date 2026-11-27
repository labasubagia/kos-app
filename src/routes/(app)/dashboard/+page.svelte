<script lang="ts">
	import { onMount } from "svelte";
	import { listActiveContracts, listRooms, listUnpaidBills, sumExpensesBetween, sumPaymentsBetween } from "$lib/db";
	import * as Card from "$lib/components/ui/card";
	import { Badge } from "$lib/components/ui/badge";
	import { Skeleton } from "$lib/components/ui/skeleton";
	import { BedDouble, Wallet, AlertTriangle, CalendarClock, CircleDollarSign } from "@lucide/svelte";
	import { balanceOf, formatIDR, totalPaid } from "$lib/logic/bills";

	type Room = {
		id: string;
		status: "available" | "reserved" | "occupied" | "maintenance";
		name: string;
		buildings: { name: string; locations: { name: string } | null } | null;
	};

	type Bill = {
		id: string;
		period: string;
		amount: number;
		status: "unpaid" | "partial" | "paid";
		contracts: { rooms: { name: string }; renters: { name: string } };
		payments: { amount: number }[] | null;
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
	let monthExpense = $state(0);
	let bills = $state<Bill[]>([]);
	let contracts = $state<Contract[]>([]);

	const idr = formatIDR;

	const now = new Date();
	const monthLabel = now.toLocaleString("id-ID", { month: "long", year: "numeric" });
	const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
	const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
		new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
	).padStart(2, "0")}`;

	onMount(async () => {
	const [r, p, b, c, e] = await Promise.all([
		listRooms(),
		sumPaymentsBetween(monthStart, monthEnd),
		listUnpaidBills(),
		listActiveContracts(),
		sumExpensesBetween(monthStart, monthEnd),
	]);
		rooms = (r.data ?? []) as unknown as Room[];
		monthIncome = (p.data ?? []).reduce((sum: number, row: { amount: number }) => sum + Number(row.amount), 0);
		monthExpense = (e.data ?? []).reduce((sum: number, row: { amount: number }) => sum + Number(row.amount), 0);
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

	const emptyRooms = $derived(rooms.filter((r) => r.status === "available"));

	type ArrearsRow = { renter: string; room: string; period: string; outstanding: number; pct: number };
	const arrearsRows = $derived(
		bills
			.map((b) => {
				const paid = totalPaid(b.payments);
				const outstanding = balanceOf(Number(b.amount), b.payments);
				return {
					renter: b.contracts.renters.name,
					room: b.contracts.rooms.name,
					period: b.period,
					outstanding,
					pct: Number(b.amount) > 0 ? Math.round((paid / Number(b.amount)) * 100) : 0,
				};
			})
			.toSorted((a, b) => {
				if (b.outstanding !== a.outstanding) return b.outstanding - a.outstanding;
				return a.pct - b.pct;
			})
	);

	const totalOutstanding = $derived(arrearsRows.reduce((sum, r) => sum + r.outstanding, 0));

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
					<div class="mt-4">
						<p class="text-xs font-medium text-muted-foreground">Empty rooms</p>
						{#if emptyRooms.length === 0}
							<p class="mt-1 text-xs text-muted-foreground">All rooms occupied</p>
						{:else}
							<ul class="mt-1 space-y-1 text-sm">
								{#each emptyRooms as r (r.id)}
									<li>{r.buildings?.name} · {r.name}</li>
								{/each}
							</ul>
						{/if}
					</div>
				{/if}
			</Card.Content>
		</Card.Root>

		<!-- Cash flow -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2"><Wallet class="h-4 w-4" /> Monthly cash flow</Card.Title>
			</Card.Header>
			<Card.Content>
				{#if loading}
					<Skeleton class="h-8 w-2/3" /><Skeleton class="mt-2 h-4 w-1/2" />
				{:else}
					<div class="space-y-3">
						<div class="flex items-center justify-between">
							<span class="text-sm text-muted-foreground flex items-center gap-2"><CircleDollarSign class="h-4 w-4" /> Income</span>
							<span class="font-semibold">{idr(monthIncome)}</span>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-sm text-muted-foreground flex items-center gap-2"><Wallet class="h-4 w-4" /> Expenses</span>
							<span class="font-semibold">{idr(monthExpense)}</span>
						</div>
						<div class="flex items-center justify-between border-t pt-3">
							<span class="text-sm font-medium">Net</span>
							<span class="text-xl font-bold {monthIncome - monthExpense < 0 ? "text-destructive" : ""}">{idr(monthIncome - monthExpense)}</span>
						</div>
						<p class="pt-1 text-sm text-muted-foreground capitalize">{monthLabel}</p>
					</div>
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
						{#each arrearsRows as r (r.renter + r.period)}
							<li class="flex items-center justify-between gap-2">
								<div class="min-w-0">
									<p class="truncate font-medium">{r.renter}</p>
									<p class="truncate text-xs text-muted-foreground">{r.room} · {r.period}</p>
								</div>
								<span class="shrink-0 font-medium">{idr(r.outstanding)}</span>
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
