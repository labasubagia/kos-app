<script lang="ts">
	import "../app.css";
	import { Toaster } from "$lib/components/ui/sonner";
	import type { LayoutProps } from "./$types";

	let { children }: LayoutProps = $props();
</script>

{@render children()}

<Toaster closeButton richColors />
