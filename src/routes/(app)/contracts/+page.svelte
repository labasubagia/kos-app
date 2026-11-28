<script lang="ts">
	import { onMount } from "svelte";
	import { checkInContract, checkOutContract, extendContract, listAvailableRooms, listContracts, listRenters } from "$lib/db";
	import * as Table from "$lib/components/ui/table";
import { Skeleton } from "$lib/components/ui/skeleton";
 import * as Dialog from "$lib/components/ui/dialog";
	import * as Input from "$lib/components/ui/input";
	import * as Label from "$lib/components/ui/label";
	import * as Select from "$lib/components/ui/select";
	import { Button } from "$lib/components/ui/button";
	import { Badge } from "$lib/components/ui/badge";
	import DatePicker from "$lib/components/date-picker.svelte";
	import { toast } from "svelte-sonner";
	import { depositRefund, isValidContractDates } from "$lib/logic/contracts";
	import { formatIDR } from "$lib/logic/bills";

	type Building = { name: string; locations: { name: string } };
	type Room = { id: string; name: string; status: string; buildings: Building | null };
	type Renter = { id: string; name: string };
	type Contract = {
		id: string;
		start_date: string;
		end_date: string | null;
		monthly_rent: number;
		deposit: number;
		due_day: number;
		grace_days: number;
		late_fee_per_period: number;
		active: boolean;
		rooms: { name: string; buildings: Building | null };
		renters: { name: string };
	};

	let contracts = $state<Contract[]>([]);
	let rooms = $state<Room[]>([]);
	let renters = $state<Renter[]>([]);
	let loading = $state(true);

	const idr = formatIDR;
	const roomLabel = (r: { name: string; buildings?: Building | null }) =>
		[r.buildings?.locations?.name, r.buildings?.name, r.name].filter(Boolean).join(" – ");

	async function load() {
		loading = true;
		const [c, r, rn] = await Promise.all([
		listContracts(),
		listAvailableRooms(),
		listRenters(),
		]);
		contracts = (c.data ?? []) as unknown as Contract[];
		rooms = (r.data ?? []) as unknown as Room[];
		renters = (rn.data ?? []) as Renter[];
		loading = false;
	}

	onMount(load);

	// ---- check-in dialog ----
	let openCheckIn = $state(false);
	let ciRenter = $state("");
	let ciRoom = $state("");
	let ciStart = $state("");
	let ciEnd = $state("");
	let ciRent = $state<number | null>(null);
	let ciDeposit = $state<number | null>(null);
	let ciDueDay = $state(1);
	let ciGrace = $state(0);
	let ciLateFee = $state<number | null>(null);
	let ciBusy = $state(false);

	function resetCheckIn() {
		ciRenter = ciRoom = ciStart = ciEnd = "";
		ciRent = ciDeposit = ciLateFee = null;
		ciDueDay = 1;
		ciGrace = 0;
	}

	async function submitCheckIn() {
		if (!ciRenter || !ciRoom || !ciStart || !ciRent) {
			toast.error("Renter, room, start date and rent are required");
			return;
		}
		if (!isValidContractDates(ciStart, ciEnd)) {
			toast.error("End date must be after start date");
			return;
		}
		ciBusy = true;
		const { error } = await checkInContract({
			p_renter_id: ciRenter,
			p_room_id: ciRoom,
			p_start_date: ciStart,
			p_end_date: ciEnd || null,
			p_monthly_rent: Number(ciRent),
			p_deposit: Number(ciDeposit ?? 0),
			p_due_day: ciDueDay,
			p_grace_days: ciGrace,
			p_late_fee_per_period: Number(ciLateFee ?? 0),
		});
		ciBusy = false;
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success("Checked in");
		openCheckIn = false;
		resetCheckIn();
		await load();
	}

	// ---- extend dialog ----
	let openExtend = $state(false);
	let extendTarget = $state<Contract | null>(null);
	let extEnd = $state("");
	let extBusy = $state(false);

	function startExtend(c: Contract) {
		extendTarget = c;
		extEnd = "";
		openExtend = true;
	}

	function submitExtend() {
		if (!extendTarget || !extEnd) {
			toast.error("New end date required");
			return;
		}
		void (async () => {
			extBusy = true;
			const { error } = await extendContract({
				p_contract_id: extendTarget.id,
				p_new_end_date: extEnd,
			});
			extBusy = false;
			if (error) {
				toast.error(error.message);
				return;
			}
			toast.success("Contract extended");
			openExtend = false;
			extendTarget = null;
			await load();
		})();
	}

	// ---- check-out dialog ----
	let openCheckout = $state(false);
	let checkoutTarget = $state<Contract | null>(null);
	let coDeductions = $state<number | null>(null);
	let coBusy = $state(false);

	function startCheckout(c: Contract) {
		checkoutTarget = c;
		coDeductions = null;
		openCheckout = true;
	}

	function submitCheckout() {
		if (!checkoutTarget) return;
		void (async () => {
			coBusy = true;
			const { data, error } = await checkOutContract({
				p_contract_id: checkoutTarget.id,
				p_deductions: Number(coDeductions ?? 0),
			});
			coBusy = false;
			if (error) {
				toast.error(error.message);
				return;
			}
			toast.success(`Checked out — deposit refund ${idr(Number(data))}`);
			openCheckout = false;
			checkoutTarget = null;
			await load();
		})();
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold">Contracts</h1>
			<p class="text-sm text-muted-foreground">Check-in, extend, and check-out</p>
		</div>
		<Button onclick={() => { resetCheckIn(); openCheckIn = true; }}>Check-in</Button>
	</div>

	<div class="rounded-lg border">
		{#if loading}
			<Table.Root>
				<Table.Body>
					{#each [1, 2, 3] as _}
						<Table.Row>
							<Table.Cell><Skeleton class="h-4 w-32" /></Table.Cell>
							<Table.Cell><Skeleton class="h-4 w-32" /></Table.Cell>
							<Table.Cell><Skeleton class="h-4 w-20" /></Table.Cell>
							<Table.Cell><Skeleton class="h-4 w-20" /></Table.Cell>
							<Table.Cell class="text-right"><Skeleton class="h-4 w-20" /></Table.Cell>
							<Table.Cell class="text-right"><Skeleton class="h-4 w-20" /></Table.Cell>
							<Table.Cell><Skeleton class="h-4 w-16" /></Table.Cell>
							<Table.Cell class="text-right"><Skeleton class="h-4 w-20" /></Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		{:else}
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Renter</Table.Head>
						<Table.Head>Room</Table.Head>
						<Table.Head>Start</Table.Head>
						<Table.Head>End</Table.Head>
						<Table.Head class="text-right">Rent</Table.Head>
						<Table.Head class="text-right">Deposit</Table.Head>
						<Table.Head>Status</Table.Head>
						<Table.Head class="text-right">Actions</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each contracts as c (c.id)}
						<Table.Row>
							<Table.Cell class="font-medium">{c.renters.name}</Table.Cell>
							<Table.Cell>{roomLabel(c.rooms)}</Table.Cell>
							<Table.Cell>{c.start_date}</Table.Cell>
							<Table.Cell>{c.end_date ?? "—"}</Table.Cell>
							<Table.Cell class="text-right">{idr(c.monthly_rent)}</Table.Cell>
							<Table.Cell class="text-right">{idr(c.deposit)}</Table.Cell>
							<Table.Cell>
								{#if c.active}
									<Badge>Active</Badge>
								{:else}
									<Badge variant="secondary">Closed</Badge>
								{/if}
							</Table.Cell>
							<Table.Cell class="text-right">
								{#if c.active}
									<Button variant="ghost" size="sm" onclick={() => startExtend(c)}>Extend</Button>
									<Button variant="ghost" size="sm" onclick={() => startCheckout(c)}>Check out</Button>
								{/if}
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		{/if}
</div>

	<!-- Check-in dialog -->
	<Dialog.Root bind:open={openCheckIn}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Check-in</Dialog.Title>
				<Dialog.Description>Create a new active contract</Dialog.Description>
			</Dialog.Header>
			<div class="grid gap-4 py-4">
				<div class="grid gap-2">
					<Label.Root>Renter</Label.Root>
					<Select.Root type="single" bind:value={ciRenter}>
						<Select.Trigger class="w-full">
							{@const sel = renters.find((x) => x.id === ciRenter)}
							{sel?.name ?? "Select renter"}
						</Select.Trigger>
						<Select.Content>
							{#each renters as r}
								<Select.Item value={r.id}>{r.name}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="grid gap-2">
					<Label.Root>Room</Label.Root>
					<Select.Root type="single" bind:value={ciRoom}>
						<Select.Trigger class="w-full">
							{@const sel = rooms.find((x) => x.id === ciRoom)}
							{sel ? roomLabel(sel) : "Select available room"}
						</Select.Trigger>
						<Select.Content>
							{#each rooms as r}
								<Select.Item value={r.id}>{roomLabel(r)}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div class="grid gap-2">
						<Label.Root>Start date</Label.Root>
					<DatePicker bind:value={ciStart} placeholder="Select start date" />
					</div>
					<div class="grid gap-2">
						<Label.Root>End date (optional)</Label.Root>
					<DatePicker bind:value={ciEnd} placeholder="Select end date" />
					</div>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div class="grid gap-2">
						<Label.Root>Monthly rent (IDR)</Label.Root>
						<Input.Root type="number" min="0" bind:value={ciRent} placeholder="0" />
					</div>
					<div class="grid gap-2">
						<Label.Root>Deposit (IDR)</Label.Root>
						<Input.Root type="number" min="0" bind:value={ciDeposit} placeholder="0" />
					</div>
				</div>
				<div class="grid grid-cols-3 gap-4">
					<div class="grid gap-2">
						<Label.Root>Due day</Label.Root>
						<Input.Root type="number" min="1" max="31" bind:value={ciDueDay} />
					</div>
					<div class="grid gap-2">
						<Label.Root>Grace days</Label.Root>
						<Input.Root type="number" min="0" bind:value={ciGrace} />
					</div>
					<div class="grid gap-2">
						<Label.Root>Late fee (IDR)</Label.Root>
						<Input.Root type="number" min="0" bind:value={ciLateFee} placeholder="0" />
					</div>
				</div>
			</div>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (openCheckIn = false)}>Cancel</Button>
				<Button onclick={submitCheckIn} disabled={ciBusy}>{ciBusy ? "Saving…" : "Check in"}</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>

	<!-- Extend dialog -->
	<Dialog.Root bind:open={openExtend}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Extend contract</Dialog.Title>
				<Dialog.Description>Set the new end date</Dialog.Description>
			</Dialog.Header>
			<div class="grid gap-2 py-4">
				<Label.Root>New end date</Label.Root>
			<DatePicker bind:value={extEnd} placeholder="Select new end date" />
			</div>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => { openExtend = false; extendTarget = null; }}>Cancel</Button>
				<Button onclick={submitExtend} disabled={extBusy}>{extBusy ? "Saving…" : "Extend"}</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>

	<!-- Check-out dialog -->
	<Dialog.Root bind:open={openCheckout}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Check out</Dialog.Title>
				<Dialog.Description>Close the contract and return the room</Dialog.Description>
			</Dialog.Header>
			{#if checkoutTarget}
				<div class="space-y-2 py-4 text-sm">
					<div class="flex justify-between"><span class="text-muted-foreground">Deposit</span><span>{idr(checkoutTarget.deposit)}</span></div>
					<div class="flex justify-between"><span class="text-muted-foreground">Est. refund (no arrears/deductions)</span><span>{idr(depositRefund(checkoutTarget.deposit, 0, 0))}</span></div>
					<div class="grid gap-2 pt-2">
						<Label.Root>Deductions (IDR)</Label.Root>
						<Input.Root type="number" min="0" bind:value={coDeductions} placeholder="0" />
					</div>
				</div>
			{/if}
			<Dialog.Footer>
				<Button variant="outline" onclick={() => { openCheckout = false; checkoutTarget = null; }}>Cancel</Button>
				<Button variant="destructive" onclick={submitCheckout} disabled={coBusy}>{coBusy ? "Saving…" : "Check out"}</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
</div>
