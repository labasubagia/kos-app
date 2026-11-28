<script lang="ts">
	import { onMount } from "svelte";
	import { tenant, user, refresh } from "$lib/stores/auth.svelte";
	import { updateTenant } from "$lib/db";
	import * as Card from "$lib/components/ui/card";
	import * as Input from "$lib/components/ui/input";
	import * as Label from "$lib/components/ui/label";
	import * as Separator from "$lib/components/ui/separator";
	import { Button } from "$lib/components/ui/button";
	import { toast } from "svelte-sonner";
	import { Save, Loader2 } from "@lucide/svelte";

	const MAX_NAME_LENGTH = 255;

	let formName = $state("");
	let saving = $state(false);

	function loadName() {
		formName = $tenant?.tenantName ?? "";
	}

	onMount(() => {
		if ($tenant?.tenantId) {
			loadName();
		}
	});

	async function save() {
		const name = formName.trim();
		if (!name) {
			toast.error("Name required");
			return;
		}
		if (name.length > MAX_NAME_LENGTH) {
			toast.error(`Name too long (max ${MAX_NAME_LENGTH} characters)`);
			return;
		}
		if (name === $tenant?.tenantName) {
			toast.info("No changes");
			return;
		}
		if (!$tenant?.tenantId) return;

		saving = true;
		const { error } = await updateTenant($tenant.tenantId, { name });
		saving = false;

		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success("Workspace updated");
		await refresh();
		loadName();
	}
</script>

<svelte:head>
	<title>Settings</title>
</svelte:head>

<div class="mx-auto max-w-2xl space-y-6 p-6">
	<div>
		<h1 class="text-2xl font-bold">Settings</h1>
		<p class="text-sm text-muted-foreground">Manage your workspace settings</p>
	</div>

	<Card.Root>
		<Card.Header>
			<Card.Title>Workspace</Card.Title>
			<Card.Description>Update your workspace name</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="grid gap-2">
				<Label.Root for="name">Workspace name</Label.Root>
				<Input.Root id="name" bind:value={formName} placeholder="Enter workspace name" disabled={saving} maxlength={MAX_NAME_LENGTH} />
			</div>
			<Separator.Root />
			<Button onclick={save} disabled={saving}>
				{#if saving}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					Saving…
				{:else}
					<Save class="mr-2 h-4 w-4" />
					Save changes
				{/if}
			</Button>
		</Card.Content>
	</Card.Root>

	{#if $tenant?.role === "owner"}
		<Card.Root>
			<Card.Header>
				<Card.Title>Danger zone</Card.Title>
				<Card.Description>Irreversible actions</Card.Description>
			</Card.Header>
			<Card.Content>
				<p class="text-sm text-muted-foreground">Additional workspace management options coming soon.</p>
			</Card.Content>
		</Card.Root>
	{/if}
</div>