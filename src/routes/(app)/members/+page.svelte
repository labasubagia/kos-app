<svelte:head><title>Members</title></svelte:head>

<script lang="ts">
	import { onMount } from "svelte";
	import { tenant, user } from "$lib/stores/auth.svelte";
	import { supabase } from "$lib/supabase";
	import * as Card from "$lib/components/ui/card";
	import * as Input from "$lib/components/ui/input";
	import * as Label from "$lib/components/ui/label";
	import * as Table from "$lib/components/ui/table";
	import { Button } from "$lib/components/ui/button";
	import { Badge } from "$lib/components/ui/badge";
	import { toast } from "svelte-sonner";
	import { Trash2, UserPlus } from "@lucide/svelte";

	type Member = { user_id: string; email: string; role: "owner" | "admin" };

	let isOwner = $derived($tenant?.role === "owner");
	let members = $state<Member[]>([]);
	let loading = $state(true);
	let inviteEmail = $state("");
	let inviting = $state(false);
	let removingId = $state<string | null>(null);

	async function loadMembers() {
		const { data, error } = await supabase.rpc("tenant_members", { p_tenant: $tenant?.tenantId });
		if (error) {
			toast.error(error.message);
			members = [];
		} else {
			members = data ?? [];
		}
		loading = false;
	}

	onMount(() => {
		if ($tenant?.tenantId) {
			loadMembers();
		}
	});

	async function invite() {
		const email = inviteEmail.trim();
		if (!email) {
			toast.error("Email required");
			return;
		}
		inviting = true;
		const { error } = await supabase.rpc("invite_member", { p_email: email });
		inviting = false;
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success(`Invited ${email}`);
		inviteEmail = "";
		await loadMembers();
	}

	async function remove(m: Member) {
		removingId = m.user_id;
		const { error } = await supabase
			.from("memberships")
			.delete()
			.eq("user_id", m.user_id)
			.eq("tenant_id", $tenant?.tenantId);
		removingId = null;
		if (error) {
			toast.error(error.message);
			return;
		}
		toast.success(`Removed ${m.email}`);
		await loadMembers();
	}
</script>

<div class="mx-auto max-w-3xl space-y-6 p-6">
	<Card.Root>
		<Card.Header>
			<Card.Title>Members</Card.Title>
			<Card.Description>People with access to this tenant</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			{#if isOwner}
				<form
					onsubmit={(e) => {
						e.preventDefault();
						invite();
					}}
					class="flex items-end gap-2"
				>
					<div class="flex-1 space-y-2">
						<Label.Root for="invite-email">Invite admin by email</Label.Root>
						<Input.Root
							id="invite-email"
							type="email"
							bind:value={inviteEmail}
							placeholder="admin@example.com"
							required
						/>
					</div>
					<Button type="submit" disabled={inviting}>
						{#if inviting}
							Inviting…
						{:else}
							<UserPlus class="size-4" /> Invite
						{/if}
					</Button>
				</form>
			{/if}

			{#if loading}
				<div class="py-8 text-center text-sm text-muted-foreground">Loading members…</div>
			{:else if members.length === 0}
				<div class="py-8 text-center text-sm text-muted-foreground">No members yet.</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Email</Table.Head>
							<Table.Head>Role</Table.Head>
							{#if isOwner}
								<Table.Head class="w-16 text-right">Actions</Table.Head>
							{/if}
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each members as m (m.user_id)}
							<Table.Row>
								<Table.Cell>{m.email}</Table.Cell>
								<Table.Cell>
									<Badge variant={m.role === "owner" ? "default" : "secondary"}>{m.role}</Badge>
								</Table.Cell>
								{#if isOwner}
									<Table.Cell class="text-right">
										{#if m.role === "admin" && m.user_id !== $user?.id}
											<Button
												variant="ghost"
												size="icon-sm"
												disabled={removingId === m.user_id}
												aria-label={`Remove ${m.email}`}
												onclick={() => remove(m)}
											>
												{#if removingId === m.user_id}
													Removing…
												{:else}
													<Trash2 class="size-4 text-destructive" />
												{/if}
											</Button>
										{/if}
									</Table.Cell>
								{/if}
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
