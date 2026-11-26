<script lang="ts">
	import { goto } from "$app/navigation";
	import { supabase } from "$lib/supabase";
	import { refresh } from "$lib/stores/auth.svelte";
	import * as Card from "$lib/components/ui/card";
	import * as Input from "$lib/components/ui/input";
	import * as Label from "$lib/components/ui/label";
	import { Button } from "$lib/components/ui/button";
	import { toast } from "svelte-sonner";

	let email = $state("");
	let password = $state("");
	let loading = $state(false);

	async function signup() {
		if (!email || password.length < 6) {
			toast.error("Valid email and password (≥6 chars) required");
			return;
		}
		loading = true;
		const { data, error } = await supabase.auth.signUp({ email, password });
		loading = false;
		if (error) {
			toast.error(error.message);
			return;
		}
		if (data.session) {
			await refresh();
			await goto("/create-tenant");
		} else {
			toast.success("Check your email for a confirmation link");
		}
	}
</script>

<div class="flex min-h-screen items-center justify-center p-4">
	<Card.Root class="w-full max-w-sm">
		<Card.Header>
			<Card.Title>Create account</Card.Title>
			<Card.Description>Sign up to start managing your boarding house</Card.Description>
		</Card.Header>
		<Card.Content>
			<form onsubmit={(e) => { e.preventDefault(); signup(); }} class="space-y-4">
				<div class="space-y-2">
					<Label.Root for="email">Email</Label.Root>
					<Input.Root id="email" type="email" bind:value={email} autocomplete="email" required />
				</div>
				<div class="space-y-2">
					<Label.Root for="password">Password</Label.Root>
					<Input.Root id="password" type="password" bind:value={password} autocomplete="new-password" required />
				</div>
				<Button type="submit" class="w-full" disabled={loading}>
					{loading ? "Creating…" : "Sign up"}
				</Button>
			</form>
		</Card.Content>
		<Card.Footer class="justify-center">
			<a href="/login" class="text-sm text-muted-foreground hover:underline">Already have an account? Sign in</a>
		</Card.Footer>
	</Card.Root>
</div>
