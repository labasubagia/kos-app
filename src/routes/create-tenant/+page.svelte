<script lang="ts">
	import { goto } from "$app/navigation";
	import { supabase } from "$lib/supabase";
	import { refresh } from "$lib/stores/auth.svelte";
	import * as Card from "$lib/components/ui/card";
	import * as Input from "$lib/components/ui/input";
	import * as Label from "$lib/components/ui/label";
	import { Button } from "$lib/components/ui/button";
	import { toast } from "svelte-sonner";

	let name = $state("");
	let loading = $state(false);

	async function createTenant() {
		if (!name.trim()) {
			toast.error("Tenant name required");
			return;
		}
		loading = true;
		const { error } = await supabase.rpc("create_tenant_as_owner", { tenant_name: name.trim() });
		loading = false;
		if (error) {
			toast.error(error.message);
			return;
		}
		await refresh();
		await goto("/dashboard");
	}
</script>

<div class="flex min-h-screen items-center justify-center p-4">
	<Card.Root class="w-full max-w-sm">
		<Card.Header>
			<Card.Title>Create your workspace</Card.Title>
			<Card.Description>Name your boarding-house business</Card.Description>
		</Card.Header>
		<Card.Content>
			<form onsubmit={(e) => { e.preventDefault(); createTenant(); }} class="space-y-4">
				<div class="space-y-2">
					<Label.Root for="name">Workspace name</Label.Root>
					<Input.Root id="name" bind:value={name} placeholder="e.g. Pondok Sejahtera" required />
				</div>
				<Button type="submit" class="w-full" disabled={loading}>
					{loading ? "Creating…" : "Create workspace"}
				</Button>
			</form>
		</Card.Content>
	</Card.Root>
</div>
