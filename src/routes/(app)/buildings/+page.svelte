<script lang="ts">
	import { onMount } from "svelte";
	import { supabase } from "$lib/supabase";
	import { toast } from "svelte-sonner";
	import { tenant } from "$lib/stores/auth.svelte";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import { Label } from "$lib/components/ui/label/index.js";
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

	type Building = {
		id: string;
		name: string;
		locations: { id: string; name: string } | null;
	};

	type Location = {
		id: string;
		name: string;
	};

	let buildings = $state<Building[]>([]);
	let locations = $state<Location[]>([]);
	let loading = $state(true);
	let form = $state({ id: "", name: "", location_id: "" });
	let dialogOpen = $state(false);
	let submitting = $state(false);
	let formError = $state("");
	let deletingId = $state<string | null>(null);

	async function loadBuildings() {
		const { data, error } = await supabase
			.from("buildings")
			.select("id, name, locations(id, name)")
			.order("name");
		if (error) {
			toast.error("Failed to load buildings", { description: error.message });
			return;
		}
		buildings = (data ?? []) as unknown as Building[];
	}

	async function loadLocations() {
		const { data } = await supabase.from("locations").select("id, name").order("name");
		if (data) locations = (data ?? []) as unknown as Location[];
	}

	function openCreate() {
		form = { id: "", name: "", location_id: locations[0]?.id ?? "" };
		formError = "";
		dialogOpen = true;
	}

	function openEdit(b: Building) {
		form = { id: b.id, name: b.name, location_id: b.locations?.id ?? "" };
		formError = "";
		dialogOpen = true;
	}

	function validate(): boolean {
		if (!form.location_id) {
			formError = "Location is required.";
			return false;
		}
		if (!form.name.trim()) {
			formError = "Building name is required.";
			return false;
		}
		return true;
	}

	async function submit() {
		formError = "";
		if (!validate()) return;
		submitting = true;
		if (form.id) {
			const { error } = await supabase
				.from("buildings")
				.update({ name: form.name.trim(), location_id: form.location_id })
				.eq("id", form.id);
			submitting = false;
			if (error) {
				formError = error.message;
				toast.error("Failed to update building", { description: error.message });
				return;
			}
			toast.success("Building updated");
		} else {
			const { error } = await supabase.from("buildings").insert({
				tenant_id: $tenant?.tenantId,
				location_id: form.location_id,
				name: form.name.trim()
			});
			submitting = false;
			if (error) {
				formError = error.message;
				toast.error("Failed to create building", { description: error.message });
				return;
			}
			toast.success("Building created");
		}
		dialogOpen = false;
		await loadBuildings();
	}

	async function deleteBuilding(b: Building) {
		deletingId = b.id;
		const { error } = await supabase.from("buildings").delete().eq("id", b.id);
		deletingId = null;
		if (error) {
			if (error.code === "23503") {
				toast.error("Cannot delete building", {
					description: `Building "${b.name}" still has rooms and cannot be removed.`
				});
			} else {
				toast.error("Failed to delete building", { description: error.message });
			}
			return;
		}
		toast.success(`Building "${b.name}" deleted`);
		await loadBuildings();
	}

	onMount(async () => {
		await Promise.all([loadBuildings(), loadLocations()]);
		loading = false;
	});
</script>

<svelte:head><title>Buildings</title></svelte:head>
<Card>
	<CardHeader class="flex-row items-center justify-between space-y-0">
		<CardTitle>Buildings</CardTitle>
		<Button onclick={openCreate}><Plus /> Add building</Button>
	</CardHeader>
	<CardContent>
		{#if loading}
			<p class="text-sm text-muted-foreground">Loading…</p>
		{:else if buildings.length === 0}
			<p class="text-sm text-muted-foreground">No buildings yet. Use "Add building" to create one.</p>
		{:else}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Name</TableHead>
						<TableHead>Location</TableHead>
						<TableHead class="text-right">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each buildings as b}
						<TableRow>
							<TableCell class="font-medium">{b.name}</TableCell>
							<TableCell>{b.locations?.name ?? "—"}</TableCell>
							<TableCell class="text-right">
								<Button variant="ghost" size="sm" onclick={() => openEdit(b)} title="Edit">
									<Pencil class="h-4 w-4" />
								</Button>
								<Button
									variant="ghost"
									size="sm"
									disabled={deletingId === b.id}
									onclick={() => deleteBuilding(b)}
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
	</CardContent>
</Card>

<Dialog bind:open={dialogOpen}>
	<DialogContent class="sm:max-w-md">
		<DialogHeader>
			<DialogTitle>{form.id ? "Edit building" : "Add building"}</DialogTitle>
			<DialogDescription>
				{form.id ? "Update the building details." : "Fill in the building details."}
			</DialogDescription>
		</DialogHeader>
		<div class="grid gap-4">
			<div class="grid gap-2">
				<Label for="bld-loc">Location</Label>
				<Select type="single" bind:value={form.location_id}>
					<SelectTrigger id="bld-loc" class="w-full">
						<SelectValue placeholder="Select location">
							{#snippet children({ selection })}
								{selection.type === "single"
									? (locations.find((l) => l.id === selection.selected?.value)?.name ?? "")
									: selection.selected.map((s) => locations.find((l) => l.id === s.value)?.name ?? "").join(", ")}
							{/snippet}
						</SelectValue>
					</SelectTrigger>
					<SelectContent>
						{#each locations as loc}
							<SelectItem value={loc.id}>{loc.name}</SelectItem>
						{/each}
					</SelectContent>
				</Select>
			</div>
			<div class="grid gap-2">
				<Label for="bld-name">Name</Label>
				<Input id="bld-name" bind:value={form.name} placeholder="e.g. Building A" maxlength={100} />
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
