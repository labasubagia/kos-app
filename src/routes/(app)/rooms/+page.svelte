<script lang="ts">
	import { onMount } from "svelte";
	import { supabase } from "$lib/supabase";
	import { toast } from "svelte-sonner";
	import { tenant } from "$lib/stores/auth.svelte";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import { Label } from "$lib/components/ui/label/index.js";
	import { Badge } from "$lib/components/ui/badge/index.js";
	import { Card, CardContent, CardHeader, CardTitle } from "$lib/components/ui/card/index.js";
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from "$lib/components/ui/table/index.js";
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from "$lib/components/ui/dialog/index.js";
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger,
		SelectValue
	} from "$lib/components/ui/select/index.js";
	import { Pencil, Trash2, Plus } from "@lucide/svelte";

	type Room = {
		id: string;
		building_id: string;
		name: string;
		type: "regular" | "vip";
		capacity: number;
		monthly_rent: number;
		status: "available" | "reserved" | "occupied" | "maintenance";
		buildings: { id: string; name: string; locations: { name: string } } | null;
	};

	type Building = {
		id: string;
		name: string;
		locations: { name: string };
	};

	const ROOM_TYPES = [
		{ value: "regular", label: "Regular" },
		{ value: "vip", label: "VIP" }
	] as const;

	const ROOM_STATUSES = [
		{ value: "available", label: "Available" },
		{ value: "reserved", label: "Reserved" },
		{ value: "occupied", label: "Occupied" },
		{ value: "maintenance", label: "Maintenance" }
	] as const;

	let rooms = $state<Room[]>([]);
	let buildings = $state<Building[]>([]);
	let loading = $state(true);

	const emptyForm = () => ({
		id: "" as string,
		building_id: "" as string,
		name: "" as string,
		type: "regular" as "regular" | "vip",
		capacity: "" as string,
		monthly_rent: "" as string,
		status: "available" as "available" | "reserved" | "occupied" | "maintenance"
	});
	let form = $state(emptyForm());
	let dialogOpen = $state(false);
	let submitting = $state(false);
	let formError = $state("");
	let deletingId = $state<string | null>(null);

	async function loadRooms() {
		const { data, error } = await supabase
			.from("rooms")
			.select(
				"id, building_id, name, type, capacity, monthly_rent, status, buildings(id, name, locations(name))"
			)
			.order("name");
		if (error) {
			toast.error("Failed to load rooms", { description: error.message });
			return;
		}
		rooms = (data ?? []) as unknown as Room[];
	}

	async function loadBuildings() {
		const { data, error } = await supabase
			.from("buildings")
			.select("id, name, locations!inner(name)")
			.order("name");
		if (!error && data) {
			buildings = (data ?? []) as unknown as Building[];
	}
	}

	onMount(async () => {
		await Promise.all([loadRooms(), loadBuildings()]);
		loading = false;
	});

	function openCreate() {
		form = emptyForm();
		formError = "";
		dialogOpen = true;
	}

	function openEdit(room: Room) {
		form = {
			id: room.id,
			building_id: room.building_id,
			name: room.name,
			type: room.type,
			capacity: String(room.capacity),
			monthly_rent: String(room.monthly_rent),
			status: room.status
		};
		formError = "";
		dialogOpen = true;
	}

	function validate(): boolean {
		if (!form.building_id) {
			formError = "Building is required.";
			return false;
		}
		if (!form.name.trim()) {
			formError = "Room name is required.";
			return false;
		}
		const capacity = Number(form.capacity);
		if (!form.capacity || !Number.isFinite(capacity) || capacity <= 0) {
			formError = "Capacity must be a number greater than 0.";
			return false;
		}
		const rent = Number(form.monthly_rent);
		if (!Number.isFinite(rent) || rent < 0) {
			formError = "Monthly rent must be a number greater than or equal to 0.";
			return false;
		}
		return true;
	}

	async function submit() {
		formError = "";
		if (!validate()) return;
		submitting = true;
		const payload = {
			tenant_id: $tenant?.tenantId,
			building_id: form.building_id,
			name: form.name.trim(),
			type: form.type,
			capacity: Number(form.capacity),
			monthly_rent: Number(form.monthly_rent),
			status: form.status
		};
		const { error } = form.id
			? await supabase.from("rooms").update(payload).eq("id", form.id)
			: await supabase.from("rooms").insert(payload);
		submitting = false;
		if (error) {
			formError = error.message;
			toast.error(form.id ? "Failed to update room" : "Failed to create room", {
				description: error.message
			});
			return;
		}
		toast.success(form.id ? "Room updated" : "Room created");
		dialogOpen = false;
		await loadRooms();
	}

	async function deleteRoom(room: Room) {
		deletingId = room.id;
		const { error } = await supabase.from("rooms").delete().eq("id", room.id);
		deletingId = null;
		if (error) {
			if (error.code === "23503") {
				toast.error("Cannot delete room", {
					description: `Room "${room.name}" is referenced by other data (e.g. contracts or bills) and cannot be removed.`
				});
			} else {
				toast.error("Failed to delete room", { description: error.message });
			}
			return;
		}
		toast.success(`Room "${room.name}" deleted`);
		await loadRooms();
	}

	function formatIDR(n: number) {
		return n.toLocaleString("id-ID");
	}
</script>

<svelte:head><title>Rooms</title></svelte:head>
<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold">Rooms</h1>
			<p class="text-sm text-muted-foreground">Manage rooms within buildings</p>
		</div>
		<div class="flex gap-2">
			<Button onclick={openCreate}><Plus class="h-4 w-4" /> Add room</Button>
		</div>
	</div>

	<div class="rounded-lg border">
		{#if loading}
			<p class="text-sm text-muted-foreground">Loading…</p>
		{:else if rooms.length === 0}
			<p class="text-sm text-muted-foreground">No rooms yet. Use "Add room" to create one.</p>
		{:else}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Name</TableHead>
						<TableHead>Building</TableHead>
						<TableHead>Location</TableHead>
						<TableHead>Type</TableHead>
						<TableHead>Capacity</TableHead>
						<TableHead>Monthly rent</TableHead>
						<TableHead>Status</TableHead>
						<TableHead class="text-right">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each rooms as room (room.id)}
						<TableRow>
							<TableCell class="font-medium">{room.name}</TableCell>
							<TableCell>{room.buildings?.name ?? "—"}</TableCell>
							<TableCell>{room.buildings?.locations.name ?? "—"}</TableCell>
							<TableCell><Badge variant="outline">{room.type}</Badge></TableCell>
							<TableCell>{room.capacity}</TableCell>
							<TableCell>Rp {formatIDR(room.monthly_rent)}</TableCell>
							<TableCell><Badge>{room.status}</Badge></TableCell>
							<TableCell class="text-right">
								<div class="flex justify-end gap-1">
									<Button variant="ghost" size="icon-sm" onclick={() => openEdit(room)} aria-label="Edit room">
										<Pencil />
									</Button>
									<Button
										variant="ghost"
										size="icon-sm"
										onclick={() => deleteRoom(room)}
										disabled={deletingId === room.id}
										aria-label="Delete room"
									>
										<Trash2 />
									</Button>
								</div>
							</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		{/if}
	</div>
</div>

<Dialog bind:open={dialogOpen}>
	<DialogContent class="sm:max-w-lg">
		<DialogHeader>
			<DialogTitle>{form.id ? "Edit room" : "Add room"}</DialogTitle>
			<DialogDescription>
				{form.id ? "Update the room details below." : "Fill in the details to create a new room."}
			</DialogDescription>
		</DialogHeader>

		<div class="grid gap-4">
			<div class="grid gap-2">
				<Label for="room-building">Building *</Label>
				<Select type="single" bind:value={form.building_id}>
					<SelectTrigger id="room-building" class="w-full">
						<SelectValue placeholder="Select building" />
					</SelectTrigger>
					<SelectContent>
						{#each buildings as building (building.id)}
							<SelectItem value={building.id} label={`${building.name} (${building.locations.name})`}>
								{building.name} ({building.locations.name})
							</SelectItem>
						{/each}
					</SelectContent>
				</Select>
			</div>

			<div class="grid gap-2">
				<Label for="room-name">Name *</Label>
				<Input id="room-name" bind:value={form.name} placeholder="e.g. A-101" />
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div class="grid gap-2">
					<Label for="room-type">Type *</Label>
					<Select type="single" bind:value={form.type}>
						<SelectTrigger id="room-type" class="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{#each ROOM_TYPES as t (t.value)}
								<SelectItem value={t.value} label={t.label}>{t.label}</SelectItem>
							{/each}
						</SelectContent>
					</Select>
				</div>
				<div class="grid gap-2">
					<Label for="room-status">Status *</Label>
					<Select type="single" bind:value={form.status}>
						<SelectTrigger id="room-status" class="w-full">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{#each ROOM_STATUSES as s (s.value)}
								<SelectItem value={s.value} label={s.label}>{s.label}</SelectItem>
							{/each}
						</SelectContent>
					</Select>
				</div>
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div class="grid gap-2">
					<Label for="room-capacity">Capacity *</Label>
					<Input id="room-capacity" type="number" min="1" bind:value={form.capacity} placeholder="0" />
				</div>
				<div class="grid gap-2">
					<Label for="room-rent">Monthly rent (IDR)</Label>
					<Input id="room-rent" type="number" min="0" step="any" bind:value={form.monthly_rent} placeholder="0" />
				</div>
			</div>

			{#if formError}
				<p class="text-sm text-destructive">{formError}</p>
			{/if}
		</div>

		<DialogFooter>
			<Button variant="outline" onclick={() => (dialogOpen = false)} disabled={submitting}>Cancel</Button>
			<Button onclick={submit} disabled={submitting}>
				{submitting ? "Saving…" : form.id ? "Save changes" : "Create room"}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
