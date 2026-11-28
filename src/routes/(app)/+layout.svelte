<script lang="ts">
	import { onMount } from "svelte";
	import { fade } from "svelte/transition";
	import { Building2, MapPin, Users, FileText, Receipt, Wallet, LayoutDashboard, CircleDollarSign, Settings } from "@lucide/svelte";
	const base = import.meta.env.BASE_URL.replace(/\/$/, "");
	import { tenant, user, requireAuth, signOut } from "$lib/stores/auth.svelte";
	import { Button } from "$lib/components/ui/button";
	import { Avatar, AvatarFallback, AvatarImage } from "$lib/components/ui/avatar";
	import * as Separator from "$lib/components/ui/separator";
	import type { LayoutProps } from "./$types";

	let { children }: LayoutProps = $props();
	let ready = $state(false);

	onMount(() => {
		void requireAuth("/dashboard").then((ok) => {
			if (ok) ready = true;
		});
	});

	const nav: { href: string; label: string; icon: typeof LayoutDashboard; ownerOnly?: boolean }[] = [
		{ href: base + "/dashboard", label: "Dashboard", icon: LayoutDashboard },
		{ href: base + "/locations", label: "Locations", icon: MapPin },
		{ href: base + "/buildings", label: "Buildings", icon: Building2 },
		{ href: base + "/rooms", label: "Rooms", icon: Building2 },
		{ href: base + "/renters", label: "Renters", icon: Users },
		{ href: base + "/contracts", label: "Contracts", icon: FileText },
		{ href: base + "/bills", label: "Bills", icon: Receipt },
		{ href: base + "/payments", label: "Payments", icon: Wallet },
		{ href: base + "/expenses", label: "Expenses", icon: CircleDollarSign },
		{ href: base + "/settings", label: "Settings", icon: Settings, ownerOnly: true },
	];

	function initials(email: string | undefined) {
		if (!email) return "?";
		return email.slice(0, 2).toUpperCase();
	}

	function handleSignOut() {
		void signOut();
	}
</script>

{#if ready}
	<div class="flex min-h-screen">
		<aside class="hidden w-64 flex-col border-r bg-sidebar md:flex">
			<div class="flex items-center gap-2 px-4 py-4">
				<div class="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
					K
				</div>
				<div>
					<p class="text-sm font-semibold leading-tight">{$tenant?.tenantName ?? "Kos App"}</p>
					<p class="text-xs text-muted-foreground capitalize">{$tenant?.role ?? ""} workspace</p>
				</div>
			</div>
			<Separator.Root />
			<nav class="flex-1 space-y-1 p-3">
				{#each nav as item}
					{#if !item.ownerOnly || $tenant?.role === "owner"}
						<a
							href={item.href}
							class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
						>
							<item.icon class="h-4 w-4" />
							{item.label}
						</a>
					{/if}
				{/each}
			</nav>
			<Separator.Root />
			<div class="flex items-center gap-3 p-4">
				<Avatar class="h-9 w-9">
					<AvatarFallback>{initials($user?.email)}</AvatarFallback>
				</Avatar>
				<div class="min-w-0 flex-1">
					<p class="truncate text-sm font-medium">{$user?.email}</p>
				</div>
				<Button variant="ghost" size="sm" onclick={handleSignOut} title="Sign out">Sign out</Button>
			</div>
		</aside>
		<div class="flex min-w-0 flex-1 flex-col">
			<header class="flex items-center justify-between border-b px-6 py-3 md:hidden">
				<p class="font-semibold">{$tenant?.tenantName ?? "Kos App"}</p>
			</header>
			<main class="flex-1 p-6" transition:fade={{ duration: 120 }}>
				{@render children()}
			</main>
		</div>
	</div>
{:else}
	<div class="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>
{/if}