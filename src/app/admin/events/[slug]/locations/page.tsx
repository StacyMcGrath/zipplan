import Link from "next/link";

import { requireEventBySlug } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

type LocationRow = {
  id: string;
  name: string;
  attributes: Record<string, unknown>;
  location_type_id: string;
};

type TypeRow = {
  id: string;
  name: string;
  position: number;
};

export default async function LocationsListPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { event } = await requireEventBySlug(slug);

  const admin = createAdminClient();

  const [{ data: typesData }, { data: locationsData }] = await Promise.all([
    admin
      .from("location_types")
      .select("id, name, position")
      .eq("event_id", event.id)
      .order("position", { ascending: true })
      .returns<TypeRow[]>(),
    admin
      .from("locations")
      .select("id, name, attributes, location_type_id")
      .eq("event_id", event.id)
      .order("name", { ascending: true })
      .returns<LocationRow[]>(),
  ]);

  const types = typesData ?? [];
  const locations = locationsData ?? [];
  const byType = new Map<string, LocationRow[]>();
  for (const loc of locations) {
    const list = byType.get(loc.location_type_id) ?? [];
    list.push(loc);
    byType.set(loc.location_type_id, list);
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <Link
        href={`/admin/events/${event.slug}`}
        className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
      >
        ← {event.name}
      </Link>

      <div className="mt-4 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Locations</h1>
        <Link
          href={`/admin/events/${event.slug}/locations/new`}
          className="inline-flex h-9 items-center rounded-md bg-zinc-900 px-3 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          + New location
        </Link>
      </div>

      {types.length === 0 ? (
        <EmptyState>
          No location types defined yet. Run the seed script (or, when CRUD
          lands, add types here) to get started.
        </EmptyState>
      ) : (
        <div className="mt-8 space-y-10">
          {types.map((type) => {
            const items = byType.get(type.id) ?? [];
            return (
              <section key={type.id}>
                <div className="flex items-baseline justify-between">
                  <h2 className="text-base font-semibold tracking-tight">
                    {type.name}
                  </h2>
                  <span className="text-sm text-zinc-500">
                    {items.length}{" "}
                    {items.length === 1 ? "location" : "locations"}
                  </span>
                </div>
                {items.length === 0 ? (
                  <p className="mt-3 text-sm text-zinc-500">None yet.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-zinc-200 overflow-hidden rounded-md border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
                    {items.map((loc) => (
                      <li key={loc.id}>
                        <Link
                          href={`/admin/events/${event.slug}/locations/${loc.id}`}
                          className="block px-4 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
                        >
                          <div className="font-medium">{loc.name}</div>
                          <div className="mt-0.5 text-sm text-zinc-500">
                            {summarize(loc.attributes)}
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-8 rounded-md border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
      {children}
    </div>
  );
}

function summarize(attributes: Record<string, unknown>): string {
  const city = typeof attributes.city === "string" ? attributes.city : "";
  const address =
    typeof attributes.address === "string" ? attributes.address : "";
  const parts = [city, address].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "—";
}
