import Link from "next/link";

import { requireEventBySlug } from "@/lib/admin-auth";
import {
  dateKeyInZone,
  formatLongDateInZone,
  formatTimeInZone,
} from "@/lib/datetime";
import { createAdminClient } from "@/lib/supabase/admin";

type ShiftRow = {
  id: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  role_label: string | null;
  location_id: string;
};

type LocationRow = {
  id: string;
  name: string;
  attributes: Record<string, unknown>;
};

export default async function ShiftsListPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { event } = await requireEventBySlug(slug);

  const admin = createAdminClient();

  // Pull all shifts for the event by joining via location_id → locations.event_id.
  // supabase-js doesn't expose joins-with-conditions cleanly here; simplest is
  // two queries and an in-memory join.
  const { data: locations } = await admin
    .from("locations")
    .select("id, name, attributes")
    .eq("event_id", event.id)
    .returns<LocationRow[]>();

  const locationsById = new Map(
    (locations ?? []).map((l) => [l.id, l] as const),
  );
  const locationIds = (locations ?? []).map((l) => l.id);

  const { data: shifts } =
    locationIds.length === 0
      ? { data: [] as ShiftRow[] }
      : await admin
          .from("shifts")
          .select("id, starts_at, ends_at, capacity, role_label, location_id")
          .in("location_id", locationIds)
          .order("starts_at", { ascending: true })
          .returns<ShiftRow[]>();

  const list = shifts ?? [];

  // Group by date in event timezone
  const byDate = new Map<string, ShiftRow[]>();
  for (const shift of list) {
    const key = dateKeyInZone(shift.starts_at, event.timezone);
    const arr = byDate.get(key) ?? [];
    arr.push(shift);
    byDate.set(key, arr);
  }
  const dateKeys = Array.from(byDate.keys()).sort();

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <Link
        href={`/admin/events/${event.slug}`}
        className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
      >
        ← {event.name}
      </Link>

      <div className="mt-4 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Shifts</h1>
        <button
          type="button"
          disabled
          title="Create form lands next session"
          className="inline-flex h-9 cursor-not-allowed items-center rounded-md border border-zinc-300 px-3 text-sm text-zinc-400 dark:border-zinc-700"
        >
          + New shift
        </button>
      </div>

      {list.length === 0 ? (
        <div className="mt-8 rounded-md border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
          No shifts yet. Run{" "}
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">
            /api/dev/seed-pan-ohio-shifts
          </code>{" "}
          to seed shifts from the route data.
        </div>
      ) : (
        <div className="mt-8 space-y-10">
          {dateKeys.map((key) => {
            const items = byDate.get(key) ?? [];
            // Use the first shift's starts_at as a sample for date formatting
            const sample = items[0].starts_at;
            return (
              <section key={key}>
                <div className="flex items-baseline justify-between">
                  <h2 className="text-base font-semibold tracking-tight">
                    {formatLongDateInZone(sample, event.timezone)}
                  </h2>
                  <span className="text-sm text-zinc-500">
                    {items.length}{" "}
                    {items.length === 1 ? "shift" : "shifts"}
                  </span>
                </div>
                <ul className="mt-3 divide-y divide-zinc-200 overflow-hidden rounded-md border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
                  {items.map((shift) => {
                    const loc = locationsById.get(shift.location_id);
                    return (
                      <li key={shift.id}>
                        <Link
                          href={`/admin/events/${event.slug}/shifts/${shift.id}`}
                          className="block px-4 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
                        >
                          <div className="flex items-baseline justify-between gap-4">
                            <div className="font-medium">
                              {loc?.name ?? "Unknown location"}
                            </div>
                            <div className="text-sm text-zinc-500">
                              {formatTimeInZone(
                                shift.starts_at,
                                event.timezone,
                              )}{" "}
                              –{" "}
                              {formatTimeInZone(
                                shift.ends_at,
                                event.timezone,
                              )}
                            </div>
                          </div>
                          <div className="mt-0.5 text-sm text-zinc-500">
                            {shift.role_label ?? "—"}
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
