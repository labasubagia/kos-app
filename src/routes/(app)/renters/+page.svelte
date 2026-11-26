<svelte:head><title>Renters</title></svelte:head>

<script lang="ts">
	import { onMount } from "svelte";
	import { Plus, Pencil, Trash2, Download } from "@lucide/svelte";
	import { downloadCsv, toCsv, todayStamp } from "$lib/csv";
	import { supabase } from "$lib/supabase";
	import * as Table from "$lib/components/ui/table";
	import * as Dialog from "$lib/components/ui/dialog";
	import * as Input from "$lib/components/ui/input";
	import * as Label from "$lib/components/ui/label";
	import { Button } from "$lib/components/ui/button";
	import { toast } from "svelte-sonner";
	import { Skeleton } from "$lib/components/ui/skeleton";

	interface Renter {
		id: string;
		name: string;
		phone: string;
		email: string | null;
		nik: string | null;
		notes: string | null;
	}

	let renters = $state<Renter[]>([]);
	let loading = $state(true);

	let formOpen = $state(false);
	let editingId = $state<string | null>(null);
	let saving = $state(false);
	let formError = $state("");

	let name = $state("");
	let phone = $state("");
	let email = $state("");
	let nik = $state("");
	let notes = $state("");

	let deleting = $state<Renter | null>(null);
	let confirmingDelete = $state(false);

	async function load() {
		const { data, error } = await supabase
			.from("renters")
			.select("id, name, phone, email, nik, notes")
			.order("name");
		loading = false;
		if (error) {
			toast.error(error.message);
			return;
		}
		renters = (data as Renter[]) ?? [];
	}

	onMount(() => {
		void load();
	});
	function exportRenters() {
		const rows: (string | null)[][] = [
			["name", "phone", "email", "nik", "notes"],
			...renters.map((r) => [r.name, r.phone, r.email, r.nik, r.notes]),
		];
		downloadCsv(`renters-${todayStamp()}.csv`, toCsv(rows));
	}

	function openCreate() {
		editingId = null;
		name = "";
		phone = "";
		email = "";
		nik = "";
		notes = "";
		formError = "";
		formOpen = true;
	}

	function openEdit(r: Renter) {
		editingId = r.id;
		name = r.name;
		phone = r.phone;
		email = r.email ?? "";
		nik = r.nik ?? "";
		notes = r.notes ?? "";
		formError = "";
		formOpen = true;
	}

	async function save() {
		const trimmedName = name.trim();
		const trimmedPhone = phone.trim();
		if (!trimmedName || !trimmedPhone) {
			formError = "Name and phone are required.";
			return;
		}
		if (trimmedPhone.length > 20) {
			formError = "Phone must be at most 20 characters.";
			return;
		}
		const payload = {
			name: trimmedName,
			phone: trimmedPhone,
			email: email.trim() || null,
			nik: nik.trim() || null,
			notes: notes.trim() || null,
		};
		saving = true;
		const query = editingId
			? supabase.from("renters").update(payload).eq("id", editingId)
			: supabase.from("renters").insert(payload);
		const { error } = await query.select().single();
		if (error) {
			formError = error.message;
			return;
		}
		formOpen = false;
		toast.success(editingId ? "Renter updated" : "Renter created");
		await load();
	}

	async function confirmDelete() {
		if (!deleting) return;
		confirmingDelete = true;
		const { error } = await supabase.from("renters").delete().eq("id", deleting.id);
		confirmingDelete = false;
		if (error) {
			deleting = null;
			if (error.code === "23503") {
				toast.error("Cannot delete this renter because they are referenced by a contract.");
			} else {
				toast.error(error.message);
			}
			return;
		}
		deleting = null;
		toast.success("Renter deleted");
		await load();
	}
</script>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold">Renters</h1>
			<p class="text-sm text-muted-foreground">Manage people renting rooms</p>
		</div>
		<div class="flex gap-2">
			<Button variant="outline" onclick={exportRenters}><Download class="h-4 w-4" /> Export CSV</Button>
			<Button onclick={openCreate}><Plus class="h-4 w-4" /> Add renter</Button>
		</div>
	</div>

	<div class="rounded-lg border">
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head>Name</Table.Head>
					<Table.Head>Phone</Table.Head>
					<Table.Head>Email</Table.Head>
					<Table.Head>NIK</Table.Head>
					<Table.Head>Notes</Table.Head>
					<Table.Head class="w-24 text-right">Actions</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#if loading}
					{#each Array(3) as _, i (i)}
						<Table.Row>
							{#each Array(5) as _, j (j)}
								<Table.Cell><Skeleton class="h-4 w-20" /></Table.Cell>
							{/each}
							<Table.Cell><Skeleton class="h-4 w-16" /></Table.Cell>
						</Table.Row>
					{/each}
				{:else if renters.length === 0}
					<Table.Row>
						<Table.Cell colspan={6} class="h-24 text-center text-muted-foreground">
							No renters yet.
						</Table.Cell>
					</Table.Row>
				{:else}
					{#each renters as r (r.id)}
						<Table.Row>
							<Table.Cell class="font-medium">{r.name}</Table.Cell>
							<Table.Cell>{r.phone}</Table.Cell>
							<Table.Cell>{r.email ?? "—"}</Table.Cell>
							<Table.Cell>{r.nik ?? "—"}</Table.Cell>
							<Table.Cell class="max-w-xs truncate">{r.notes ?? "—"}</Table.Cell>
							<Table.Cell class="text-right">
								<div class="flex justify-end gap-1">
									<Button variant="ghost" size="sm" onclick={() => openEdit(r)} title="Edit">
										<Pencil class="h-4 w-4" />
									</Button>
									<Button variant="ghost" size="sm" onclick={() => (deleting = r)} title="Delete" class="text-destructive hover:text-destructive">
										<Trash2 class="h-4 w-4" />
									</Button>
								</div>
							</Table.Cell>
						</Table.Row>
					{/each}
				{/if}
			</Table.Body>
		</Table.Root>
	</div>
</div>

<Dialog.Root bind:open={formOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{editingId ? "Edit renter" : "Add renter"}</Dialog.Title>
			<Dialog.Description>{editingId ? "Update renter details." : "Add a new renter to your workspace."}</Dialog.Description>
		</Dialog.Header>
		<form onsubmit={(e) => { e.preventDefault(); void save(); }} class="space-y-4">
			<div class="space-y-2">
				<Label.Root for="renter-name">Name</Label.Root>
				<Input.Root id="renter-name" bind:value={name} placeholder="e.g. Budi Santoso" />
			</div>
			<div class="space-y-2">
				<Label.Root for="renter-phone">Phone</Label.Root>
				<Input.Root id="renter-phone" bind:value={phone} maxlength={20} placeholder="e.g. 081234567890" />
			</div>
			<div class="space-y-2">
				<Label.Root for="renter-email">Email <span class="text-muted-foreground">(optional)</span></Label.Root>
				<Input.Root id="renter-email" type="email" bind:value={email} placeholder="e.g. budi@example.com" />
			</div>
			<div class="space-y-2">
				<Label.Root for="renter-nik">NIK <span class="text-muted-foreground">(optional)</span></Label.Root>
				<Input.Root id="renter-nik" bind:value={nik} placeholder="National ID number" />
			</div>
			<div class="space-y-2">
				<Label.Root for="renter-notes">Notes <span class="text-muted-foreground">(optional)</span></Label.Root>
				<textarea
					id="renter-notes"
					bind:value={notes}
					rows={3}
					placeholder="Anything worth remembering"
					class="w-full rounded-md border border-input bg-transparent px-2.5 py-2 text-base shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-3 disabled:opacity-50 md:text-sm"
				></textarea>
			</div>
			{#if formError}
				<p class="text-sm text-destructive">{formError}</p>
			{/if}
			<Dialog.Footer>
				<Dialog.Close>
					{#snippet child({ props })}
						<Button variant="outline" type="button" {...props}>Cancel</Button>
					{/snippet}
				</Dialog.Close>
				<Button type="submit" disabled={saving}>
					{saving ? "Saving…" : editingId ? "Save changes" : "Create renter"}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root open={deleting !== null} onOpenChange={(o) => { if (!o) deleting = null; }}>
	<Dialog.Content class="sm:max-w-sm">
		<Dialog.Header>
			<Dialog.Title>Delete renter</Dialog.Title>
			<Dialog.Description>
				Are you sure you want to delete <span class="font-medium">{deleting?.name}</span>? This action cannot be undone.
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Dialog.Close>
				{#snippet child({ props })}
					<Button variant="outline" {...props}>Cancel</Button>
				{/snippet}
			</Dialog.Close>
			<Button variant="destructive" onclick={() => void confirmDelete()} disabled={confirmingDelete}>
				{confirmingDelete ? "Deleting…" : "Delete"}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
