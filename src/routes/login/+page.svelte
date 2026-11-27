<script lang="ts">
	import { goto } from "$app/navigation";
	const base = import.meta.env.BASE_URL.replace(/\/$/, "");
	import { supabase } from "$lib/supabase";
	import { refresh, tenant } from "$lib/stores/auth.svelte";
	import * as Card from "$lib/components/ui/card";
	import * as Input from "$lib/components/ui/input";
	import * as Label from "$lib/components/ui/label";
	import { Button } from "$lib/components/ui/button";
	import { toast } from "svelte-sonner";

	let email = $state("");
	let password = $state("");
	let loading = $state(false);

	async function login() {
		if (!email || !password) {
			toast.error("Email and password required");
			return;
		}
		loading = true;
		const { error } = await supabase.auth.signInWithPassword({ email, password });
		loading = false;
		if (error) {
			toast.error(error.message);
			return;
		}
		await refresh();
		await goto($tenant ? base + "/dashboard" : base + "/create-tenant");
	}
</script>

<div class="flex min-h-screen items-center justify-center p-4">
	<Card.Root class="w-full max-w-sm">
		<Card.Header>
			<Card.Title>Sign in</Card.Title>
			<Card.Description>Access your boarding-house workspace</Card.Description>
		</Card.Header>
		<Card.Content>
			<form onsubmit={(e) => { e.preventDefault(); login(); }} class="space-y-4">
				<div class="space-y-2">
					<Label.Root for="email">Email</Label.Root>
					<Input.Root id="email" type="email" bind:value={email} autocomplete="email" required />
				</div>
				<div class="space-y-2">
					<Label.Root for="password">Password</Label.Root>
					<Input.Root id="password" type="password" bind:value={password} autocomplete="current-password" required />
				</div>
				<Button type="submit" class="w-full" disabled={loading}>
					{loading ? "Signing in…" : "Sign in"}
				</Button>
			</form>
		</Card.Content>
		<Card.Footer class="justify-center">
			<a href={base + "/signup"} class="text-sm text-muted-foreground hover:underline">No account? Sign up</a>
		</Card.Footer>
	</Card.Root>
</div>
