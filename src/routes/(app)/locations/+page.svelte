<script lang="ts">
	import { onMount } from "svelte";
	import { createLocation, listLocations, removeLocation, updateLocation } from "$lib/db";
	import { toast } from "svelte-sonner";
	import { tenant } from "$lib/stores/auth.svelte";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import { Label } from "$lib/components/ui/label/index.js";
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from "$lib/components/ui/table/index.js";
import { Skeleton } from "$lib/components/ui/skeleton";
 import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from "$lib/components/ui/dialog/index.js";
	import { Pencil, Trash2, Plus } from "@lucide/svelte";

	type Location = {
		id: string;
		name: string;
		buildings: { count: number }[];
	};

	let locations = $state<Location[]>([]);
	let loading = $state(true);
	let form = $state({ id: "", name: "" });
	let dialogOpen = $state(false);
	let submitting = $state(false);
	let formError = $state("");
	let deletingId = $state<string | null>(null);

	async function loadLocations() {
		const { data, error } = await listLocations();
		if (error) {
			toast.error("Failed to load locations", { description: error.message });
			return;
		}
		locations = (data ?? []) as unknown as Location[];
	}

	function openCreate() {
		form = { id: "", name: "" };
		formError = "";
		dialogOpen = true;
	}

	function openEdit(loc: Location) {
		form = { id: loc.id, name: loc.name };
		formError = "";
		dialogOpen = true;
	}

	function validate(): boolean {
		if (!form.name.trim()) {
			formError = "Location name is required.";
			return false;
		}
		return true;
	}

	async function submit() {
		formError = "";
		if (!validate()) return;
		submitting = true;
		if (form.id) {
			const { error } = await updateLocation(form.id, { name: form.name.trim() });
			submitting = false;
			if (error) {
				formError = error.message;
				toast.error("Failed to update location", { description: error.message });
				return;
			}
			toast.success("Location updated");
		} else {
			const { error } = await createLocation({
				tenant_id: $tenant?.tenantId,
				name: form.name.trim(),
			});
			submitting = false;
			if (error) {
				formError = error.message;
				toast.error("Failed to create location", { description: error.message });
				return;
			}
			toast.success("Location created");
		}
		dialogOpen = false;
		await loadLocations();
	}

	async function deleteLocation(loc: Location) {
		deletingId = loc.id;
		const { error } = await removeLocation(loc.id);
		deletingId = null;
		if (error) {
			if (error.code === "23503") {
				toast.error("Cannot delete location", {
					description: `Location "${loc.name}" still has buildings and cannot be removed.`
				});
			} else {
				toast.error("Failed to delete location", { description: error.message });
			}
			return;
		}
		toast.success(`Location "${loc.name}" deleted`);
		await loadLocations();
	}

	onMount(async () => {
		await loadLocations();
		loading = false;
	});
</script>

<svelte:head><title>Locations</title></svelte:head>
<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold">Locations</h1>
			<p class="text-sm text-muted-foreground">Manage locations for your properties</p>
		</div>
		<div class="flex gap-2">
			<Button onclick={openCreate}><Plus class="h-4 w-4" /> Add location</Button>
		</div>
	</div>

	<div class="rounded-lg border">
			{#if loading}
				<Table>
					<TableBody>
						{#each [1, 2, 3] as _}
							<TableRow>
								<TableCell><Skeleton class="h-4 w-40" /></TableCell>
								<TableCell><Skeleton class="h-4 w-16" /></TableCell>
								<TableCell class="text-right"><Skeleton class="h-4 w-16" /></TableCell>
							</TableRow>
						{/each}
					</TableBody>
				</Table>
			{:else if locations.length === 0}
			<p class="text-sm text-muted-foreground">No locations yet. Use "Add location" to create one.</p>
		{:else}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Name</TableHead>
						<TableHead>Buildings</TableHead>
						<TableHead class="text-right">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each locations as loc}
						<TableRow>
							<TableCell class="font-medium">{loc.name}</TableCell>
							<TableCell>{loc.buildings[0]?.count ?? 0}</TableCell>
							<TableCell class="text-right">
								<Button variant="ghost" size="sm" onclick={() => openEdit(loc)} title="Edit">
									<Pencil class="h-4 w-4" />
								</Button>
								<Button
									variant="ghost"
									size="sm"
									disabled={deletingId === loc.id}
									onclick={() => deleteLocation(loc)}
									title="Delete"
								>
									<Trash2 class="h-4 w-4" />
								</Button>
							</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		{/if}
	</div>
</div>

<Dialog bind:open={dialogOpen}>
	<DialogContent class="sm:max-w-md">
		<DialogHeader>
			<DialogTitle>{form.id ? "Edit location" : "Add location"}</DialogTitle>
			<DialogDescription>
				{form.id ? "Update the location name." : "Fill in the location name."}
			</DialogDescription>
		</DialogHeader>
		<div class="grid gap-4">
			<div class="grid gap-2">
				<Label for="loc-name">Name</Label>
				<Input id="loc-name" bind:value={form.name} placeholder="e.g. Main property" maxlength={255} />
			</div>
			{#if formError}
				<p class="text-sm text-destructive">{formError}</p>
			{/if}
		</div>
		<DialogFooter>
			<Button variant="outline" onclick={() => (dialogOpen = false)}>Cancel</Button>
			<Button onclick={submit} disabled={submitting}>{submitting ? "Saving…" : form.id ? "Save" : "Create"}</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
