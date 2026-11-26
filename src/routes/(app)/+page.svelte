<script lang="ts">
	import { onMount } from "svelte";
	import { goto } from "$app/navigation";
	import { refresh, tenant, init } from "$lib/stores/auth.svelte";

	onMount(async () => {
		await init();
		await refresh();
		await goto($tenant ? "/dashboard" : "/create-tenant");
	});
</script>

<div class="flex min-h-screen items-center justify-center text-muted-foreground">Redirecting…</div>
