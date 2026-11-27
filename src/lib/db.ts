// Central data-access layer. All Supabase I/O lives here; pages import from
// `$lib/db` instead of the client directly. Keeps join shapes single-source
// and makes data access swappable/testable in isolation.
import { supabase } from "$lib/supabase";

// ---- bills ----
export const listBillsForMonth = (period: string) =>
	supabase
		.from("bills")
		.select("*, payments(amount), contracts!inner(rooms(name), renters(name))")
		.eq("period", period)
		.order("due_date", { ascending: true });

export const generateBills = () => supabase.rpc("generate_bills");

// ---- payments ----
export const listPayments = () =>
	supabase
		.from("payments")
		.select("*, bills!inner(period, contracts!inner(rooms(name), renters(name)))")
		.order("date", { ascending: false });

export const listActiveContractsWithOutstanding = () =>
	supabase
		.from("contracts")
		.select("id, rooms(name), renters(name), bills(amount, status, period)")
		.eq("active", true);

export const recordPayment = (input: {
	p_contract_id: string;
	p_amount: number;
	p_method: string;
	p_date?: string;
	p_notes?: string | null;
}) => supabase.rpc("record_payment", input);

// ---- dashboard ----
export const listRooms = () =>
	supabase.from("rooms").select("id, name, status, buildings(name, locations(name))");

export const sumPaymentsBetween = (start: string, end: string) =>
	supabase.from("payments").select("amount").gte("date", start).lte("date", end);

export const listUnpaidBills = () =>
	supabase
		.from("bills")
		.select("id, period, amount, status, payments(amount), contracts!inner(rooms(name), renters(name))")
		.neq("status", "paid");

export const listActiveContracts = () =>
	supabase.from("contracts").select("id, end_date, rooms(name), renters(name)").eq("active", true);

export const sumExpensesBetween = (start: string, end: string) =>
	supabase.from("expenses").select("amount").gte("date", start).lte("date", end);

// ---- rooms ----
export const listRoomsDetailed = () =>
	supabase
		.from("rooms")
		.select("id, building_id, name, type, capacity, monthly_rent, status, buildings(id, name, locations(name))")
		.order("name");

export const listBuildingsWithLocations = () =>
	supabase.from("buildings").select("id, name, locations!inner(name)").order("name");

export const createRoom = (payload: Record<string, unknown>) => supabase.from("rooms").insert(payload);
export const updateRoom = (id: string, payload: Record<string, unknown>) =>
	supabase.from("rooms").update(payload).eq("id", id);
export const removeRoom = (id: string) => supabase.from("rooms").delete().eq("id", id);

// ---- contracts ----
export const listContracts = () =>
	supabase
		.from("contracts")
		.select("*, rooms(buildings(locations(name), name), name), renters(name)")
		.order("start_date", { ascending: false });

export const listAvailableRooms = () =>
	supabase
		.from("rooms")
		.select("id, name, status, buildings(locations(name), name)")
		.eq("status", "available")
		.order("name");

export const listRenters = () => supabase.from("renters").select("id, name").order("name");

export const checkInContract = (input: {
	p_renter_id: string;
	p_room_id: string;
	p_start_date: string;
	p_end_date?: string | null;
	p_monthly_rent: number;
	p_deposit: number;
	p_due_day: number;
	p_grace_days: number;
	p_late_fee_per_period: number;
}) => supabase.rpc("check_in_contract", input);

export const extendContract = (input: { p_contract_id: string; p_new_end_date: string }) =>
	supabase.rpc("extend_contract", input);

export const checkOutContract = (input: { p_contract_id: string; p_deductions: number }) =>
	supabase.rpc("check_out_contract", input);

// ---- members ----
export const listMembers = (tenantId: string) => supabase.rpc("tenant_members", { p_tenant: tenantId });
export const inviteMember = (email: string) => supabase.rpc("invite_member", { p_email: email });
export const removeMember = (userId: string, tenantId: string) =>
	supabase.from("memberships").delete().eq("user_id", userId).eq("tenant_id", tenantId);

// ---- locations ----
export const listLocations = () =>
	supabase.from("locations").select("id, name, buildings(count)").order("name");

export const createLocation = (payload: Record<string, unknown>) => supabase.from("locations").insert(payload);
export const updateLocation = (id: string, payload: Record<string, unknown>) =>
	supabase.from("locations").update(payload).eq("id", id);
export const removeLocation = (id: string) => supabase.from("locations").delete().eq("id", id);

// ---- buildings ----
export const listBuildings = () =>
	supabase.from("buildings").select("id, name, locations(id, name)").order("name");

export const listLocationOptions = () => supabase.from("locations").select("id, name").order("name");

export const createBuilding = (payload: Record<string, unknown>) => supabase.from("buildings").insert(payload);
export const updateBuilding = (id: string, payload: Record<string, unknown>) =>
	supabase.from("buildings").update(payload).eq("id", id);
export const removeBuilding = (id: string) => supabase.from("buildings").delete().eq("id", id);

// ---- expenses ----
export const listExpenses = () =>
	supabase
		.from("expenses")
		.select("id, category, amount, date, notes, location_id, building_id, locations(id, name), buildings(id, name, locations(name))")
		.order("date", { ascending: false });

export const listBuildingOptions = () =>
	supabase.from("buildings").select("id, name, locations!inner(name)").order("name");

export const createExpense = (payload: Record<string, unknown>) => supabase.from("expenses").insert(payload);
export const updateExpense = (id: string, payload: Record<string, unknown>) =>
	supabase.from("expenses").update(payload).eq("id", id);
export const removeExpense = (id: string) => supabase.from("expenses").delete().eq("id", id);

// ---- renters ----
export const listRentersDetailed = () =>
	supabase.from("renters").select("id, name, phone, email, nik, notes").order("name");

export const createRenter = (payload: Record<string, unknown>) =>
	supabase.from("renters").insert(payload).select().single();
export const updateRenter = (id: string, payload: Record<string, unknown>) =>
	supabase.from("renters").update(payload).eq("id", id).select().single();
export const removeRenter = (id: string) => supabase.from("renters").delete().eq("id", id);
