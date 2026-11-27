import { goto } from "$app/navigation";
const base = import.meta.env.BASE_URL.replace(/\/$/, "");
import { get, writable } from "svelte/store";
import { supabase } from "$lib/supabase";
import type { User } from "@supabase/supabase-js";

const browser = typeof window !== "undefined";

export interface TenantCtx {
	tenantId: string;
	tenantName: string;
	role: "owner" | "admin";
}

export type AuthStatus = "loading" | "unauthenticated" | "no-tenant" | "ready";

export const user = writable<User | null>(null);
export const tenant = writable<TenantCtx | null>(null);
export const status = writable<AuthStatus>("loading");

async function loadTenant(uid: string): Promise<void> {
	const { data } = await supabase
		.from("memberships")
		.select("tenant_id, role, tenants!inner(name)")
		.eq("user_id", uid)
		.maybeSingle();

	if (data) {
		const t = data as unknown as { tenant_id: string; role: "owner" | "admin"; tenants: { name: string } };
		tenant.set({ tenantId: t.tenant_id, tenantName: t.tenants.name, role: t.role });
		status.set("ready");
	} else {
		tenant.set(null);
		status.set("no-tenant");
	}
}

export async function refresh(): Promise<void> {
	status.set("loading");
	const { data } = await supabase.auth.getUser();
	user.set(data.user);
	if (!data.user) {
		tenant.set(null);
		status.set("unauthenticated");
		return;
	}
	await loadTenant(data.user.id);
}

export async function init(): Promise<void> {
	if (!browser) return;
	supabase.auth.onAuthStateChange((_event, session) => {
		if (session?.user) {
			user.set(session.user);
			void loadTenant(session.user.id);
		} else {
			user.set(null);
			tenant.set(null);
			status.set("unauthenticated");
		}
	});
	await refresh();
}

export async function signOut(): Promise<void> {
	await supabase.auth.signOut();
	user.set(null);
	tenant.set(null);
	status.set("unauthenticated");
	await goto(base + "/login");
}

export async function requireAuth(target: string): Promise<boolean> {
	if (!browser) return false;
	if (get(status) === "loading") {
		await refresh();
	}
	if (get(status) === "unauthenticated") {
		await goto(base + "/login?redirect=" + encodeURIComponent(target));
		return false;
	}
	if (get(status) === "no-tenant") {
		await goto(base + "/create-tenant?redirect=" + encodeURIComponent(target));
		return false;
	}
	return true;
}
if (browser) void init();
