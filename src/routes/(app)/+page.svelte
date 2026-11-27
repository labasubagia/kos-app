<script lang="ts">
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	const base = import.meta.env.BASE_URL.replace(/\/$/, "");
	import { refresh, tenant, init } from "$lib/stores/auth.svelte";

	onMount(async () => {
		await init();
		await refresh();
		await goto($tenant ? base + "/dashboard" : base + "/create-tenant");
	});
</script>

<div class="flex min-h-screen items-center justify-center text-muted-foreground">Redirecting…</div>
