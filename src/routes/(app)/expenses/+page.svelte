<script lang="ts">
	import { onMount } from "svelte";
	import { createExpense, listBuildingOptions, listExpenses, listLocationOptions, removeExpense, updateExpense } from "$lib/db";
	import { toast } from "svelte-sonner";
	import { tenant } from "$lib/stores/auth.svelte.ts";
	import { Button } from "$lib/components/ui/button/index.js";
	import { Input } from "$lib/components/ui/input/index.js";
	import { Label } from "$lib/components/ui/label/index.js";
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger,
		SelectValue
	} from "$lib/components/ui/select/index.js";
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle
	} from "$lib/components/ui/dialog/index.js";
	import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "$lib/components/ui/table/index.js";
import { Skeleton } from "$lib/components/ui/skeleton";
 import DatePicker from "$lib/components/date-picker.svelte";
	import { Badge } from "$lib/components/ui/badge/index.js";
	import { Pencil, Trash2, Plus } from "@lucide/svelte";
	import { formatIDR } from "$lib/logic/bills";

	type Expense = {
		id: string;
		category: "water" | "electricity" | "maintenance" | "other" | null;
		amount: number;
		date: string;
		notes: string | null;
		location_id: string | null;
		building_id: string | null;
		locations: { id: string; name: string } | null;
		buildings: { id: string; name: string; locations: { name: string } } | null;
	};

	type Category = { value: NonNullable<Expense["category"]>; label: string };
	type Location = { id: string; name: string };
	type Building = { id: string; name: string; locations: { name: string } };

	const CATEGORIES: Category[] = [
		{ value: "water", label: "Water" },
		{ value: "electricity", label: "Electricity" },
		{ value: "maintenance", label: "Maintenance" },
		{ value: "other", label: "Other" }
	];

	let expenses = $state<Expense[]>([]);
	let locations = $state<Location[]>([]);
	let buildings = $state<Building[]>([]);
	let loading = $state(true);

	const emptyForm = () => ({
		id: "" as string,
		category: "none" as string,
		location_id: "none" as string,
		building_id: "none" as string,
		amount: "" as string,
		date: "" as string,
		notes: "" as string
	});
	let form = $state(emptyForm());
	let dialogOpen = $state(false);
	let submitting = $state(false);
	let formError = $state("");
	let deletingId = $state<string | null>(null);

	async function load() {
		const { data, error } = await listExpenses();
		if (error) {
			toast.error("Failed to load expenses", { description: error.message });
			return;
		}
		expenses = (data ?? []) as unknown as Expense[];
	}

	async function loadLinks() {
		const [loc, bld] = await Promise.all([
		listLocationOptions(),
		listBuildingOptions(),
		]);
	if (!loc.error && loc.data) locations = loc.data as unknown as Location[];
		if (!bld.error && bld.data) buildings = bld.data as unknown as Building[];
	}

	onMount(async () => {
		await Promise.all([load(), loadLinks()]);
		loading = false;
	});

	function openCreate() {
		form = emptyForm();
		formError = "";
		dialogOpen = true;
	}

	function openEdit(e: Expense) {
		form = {
			id: e.id,
			category: e.category ?? "none",
			location_id: e.location_id ?? "none",
			building_id: e.building_id ?? "none",
			amount: String(e.amount),
			date: e.date,
			notes: e.notes ?? ""
		};
		formError = "";
		dialogOpen = true;
	}

	async function submit() {
		formError = "";
		const amount = Number(form.amount);
		if (!form.amount || !Number.isFinite(amount) || amount <= 0) {
			formError = "Amount must be a number greater than 0.";
			return;
		}
		submitting = true;
		const payload = {
			tenant_id: $tenant?.tenantId,
			category: form.category === "none" ? null : form.category,
			location_id: form.location_id === "none" ? null : form.location_id,
			building_id: form.building_id === "none" ? null : form.building_id,
			amount,
			date: form.date || undefined,
			notes: form.notes.trim() || null
		};
		const { error } = form.id
			? await updateExpense(form.id, payload)
			: await createExpense(payload);
		submitting = false;
		if (error) {
			formError = error.message;
			toast.error(form.id ? "Failed to update expense" : "Failed to add expense", {
				description: error.message
			});
			return;
		}
		toast.success(form.id ? "Expense updated" : "Expense added");
		dialogOpen = false;
		await load();
	}

	async function deleteExpense(e: Expense) {
		deletingId = e.id;
		const { error } = await removeExpense(e.id);
		deletingId = null;
		if (error) {
			toast.error("Failed to delete expense", { description: error.message });
			return;
		}
		toast.success("Expense deleted");
		await load();
	}

	const categoryLabel = (c: Expense["category"]) => CATEGORIES.find((x) => x.value === c)?.label ?? "";
	const idr = formatIDR;
</script>

<svelte:head><title>Expenses</title></svelte:head>
<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold">Expenses</h1>
			<p class="text-sm text-muted-foreground">Record operating costs — utilities, maintenance, and more</p>
		</div>
		<Button onclick={openCreate}><Plus class="h-4 w-4" /> Add expense</Button>
	</div>

		<div class="rounded-lg border">
			{#if loading}
				<Table>
					<TableBody>
						{#each [1, 2, 3] as _}
							<TableRow>
								<TableCell><Skeleton class="h-4 w-20" /></TableCell>
								<TableCell><Skeleton class="h-4 w-24" /></TableCell>
								<TableCell><Skeleton class="h-4 w-32" /></TableCell>
								<TableCell class="text-right"><Skeleton class="h-4 w-24" /></TableCell>
								<TableCell><Skeleton class="h-4 w-28" /></TableCell>
								<TableCell class="text-right"><Skeleton class="h-4 w-16" /></TableCell>
							</TableRow>
						{/each}
					</TableBody>
				</Table>
			{:else if expenses.length === 0}
			<p class="text-sm text-muted-foreground p-4">Loading…</p>
		{:else if expenses.length === 0}
			<p class="text-sm text-muted-foreground p-4">No expenses yet. Use "Add expense" to record one.</p>
		{:else}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>Category</TableHead>
						<TableHead>Date</TableHead>
						<TableHead>Location / Building</TableHead>
						<TableHead class="text-right">Amount</TableHead>
						<TableHead>Notes</TableHead>
						<TableHead class="text-right">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each expenses as e (e.id)}
						<TableRow>
							<TableCell>
								{#if e.category}
									<Badge variant="secondary">{categoryLabel(e.category)}</Badge>
								{:else}
									<span class="text-muted-foreground">—</span>
								{/if}
							</TableCell>
							<TableCell>{e.date}</TableCell>
							<TableCell class="max-w-xs truncate text-muted-foreground">
								{e.buildings ? `${e.buildings.name} (${e.buildings.locations.name})` : e.locations?.name ?? "-"}
							</TableCell>
							<TableCell class="text-right font-medium">{idr(e.amount)}</TableCell>
							<TableCell class="text-muted-foreground">{e.notes ?? "-"}</TableCell>
							<TableCell class="text-right">
								<div class="flex justify-end gap-1">
									<Button variant="ghost" size="sm" onclick={() => openEdit(e)} title="Edit">
										<Pencil class="h-4 w-4" />
									</Button>
									<Button variant="ghost" size="sm" onclick={() => deleteExpense(e)} disabled={deletingId === e.id} title="Delete">
										<Trash2 class="h-4 w-4" />
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
	<DialogContent class="sm:max-w-md">
		<DialogHeader>
			<DialogTitle>{form.id ? "Edit expense" : "Add expense"}</DialogTitle>
			<DialogDescription>
				{form.id ? "Update the expense details below." : "Record an operating cost (utilities, maintenance, etc.)."}
			</DialogDescription>
		</DialogHeader>

		<div class="grid gap-4">
			<div class="grid gap-2">
				<Label>Category (optional)</Label>
				<Select type="single" bind:value={form.category}>
					<SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
					<SelectContent>
						<SelectItem value="none">No category</SelectItem>
						{#each CATEGORIES as c}
							<SelectItem value={c.value}>{c.label}</SelectItem>
						{/each}
					</SelectContent>
				</Select>
			</div>

			<div class="grid gap-2">
				<div class="grid gap-2">
					<Label>Location (optional)</Label>
					<Select type="single" bind:value={form.location_id}>
						<SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger>
						<SelectContent>
							<SelectItem value="none">None</SelectItem>
							{#each locations as l}
							<SelectItem value={l.id} label={l.name}>{l.name}</SelectItem>
							{/each}
						</SelectContent>
					</Select>
				</div>
				<div class="grid gap-2">
					<Label>Building (optional)</Label>
					<Select type="single" bind:value={form.building_id}>
						<SelectTrigger><SelectValue placeholder="Select building" /></SelectTrigger>
						<SelectContent>
							<SelectItem value="none">None</SelectItem>
							{#each buildings as b}
							<SelectItem value={b.id} label={`${b.name} (${b.locations.name})`}>{b.name} ({b.locations.name})</SelectItem>
							{/each}
						</SelectContent>
					</Select>
				</div>
			</div>

			<div class="grid gap-2">
				<Label>Amount (IDR)</Label>
				<Input type="number" min="0" step="any" bind:value={form.amount} placeholder="0" />
			</div>

			<div class="grid gap-2">
				<Label>Date</Label>
				<DatePicker bind:value={form.date} />
			</div>

			<div class="grid gap-2">
				<Label>Notes</Label>
				<Input bind:value={form.notes} placeholder="Optional (e.g. PLN bill, plumbing repair)" />
			</div>

			{#if formError}
				<p class="text-sm text-destructive">{formError}</p>
			{/if}
		</div>

		<DialogFooter>
			<Button variant="outline" onclick={() => (dialogOpen = false)}>Cancel</Button>
			<Button onclick={submit} disabled={submitting}>{submitting ? "Saving…" : form.id ? "Save" : "Add"}</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
