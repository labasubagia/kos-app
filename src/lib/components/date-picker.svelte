<script lang="ts">
	import { CalendarDate, getLocalTimeZone, type DateValue } from "@internationalized/date";
	import * as Popover from "$lib/components/ui/popover";
	import { Calendar } from "$lib/components/ui/calendar";
	import CalendarDaysIcon from "@lucide/svelte/icons/calendar-days";

	let {
		value = $bindable(""),
		placeholder = "Pick a date",
		class: klass = "",
	}: { value?: string; placeholder?: string; class?: string } = $props();

	function isoToCal(iso: string): CalendarDate | undefined {
		if (!iso) return undefined;
		const [y, m, d] = iso.split("-").map(Number);
		return new CalendarDate(y, m, d);
	}
	const ym = (n: number) => String(n).padStart(2, "0");

	const selected = $derived(isoToCal(value));

	function choose(d: DateValue | undefined) {
		value = d ? `${d.year}-${ym(d.month)}-${ym(d.day)}` : "";
	}

	const fmt = new Intl.DateTimeFormat("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
</script>

<Popover.Root>
	<Popover.Trigger
		class="inline-flex h-9 w-full items-center justify-start gap-2 rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring data-[state=open]:bg-accent {klass}"
	>
		<CalendarDaysIcon class="size-4 opacity-50" />
		<span class={selected ? "" : "text-muted-foreground"}>
			{selected ? fmt.format(selected.toDate(getLocalTimeZone())) : placeholder}
		</span>
	</Popover.Trigger>
	<Popover.Content align="start" class="w-auto p-0">
		<Calendar type="single" value={selected} onValueChange={choose} />
	</Popover.Content>
</Popover.Root>
