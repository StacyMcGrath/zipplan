import { redirect } from "next/navigation";

import { getCurrentMembership } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

type EventRow = {
  id: string;
  name: string;
  slug: string;
  starts_on: string;
  ends_on: string;
  status: string;
};

export default async function AdminDashboard() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/admin/setup");

  const admin = createAdminClient();
  const { data: events } = await admin
    .from("events")
    .select("id, name, slug, starts_on, ends_on, status")
    .eq("organization_id", membership.organization_id)
    .order("starts_on", { ascending: false })
    .returns<EventRow[]>();

  const list = events ?? [];

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {membership.organization.name}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">Events</p>
        </div>
        <button
          type="button"
          disabled
          title="Event CRUD lands next"
          className="inline-flex h-9 cursor-not-allowed items-center rounded-md border border-zinc-300 px-3 text-sm text-zinc-400 dark:border-zinc-700"
        >
          + New event
        </button>
      </div>

      <div className="mt-8">
        {list.length === 0 ? (
          <div className="rounded-md border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
            No events yet. Event CRUD lands next.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200 overflow-hidden rounded-md border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
            {list.map((e) => (
              <li key={e.id} className="px-4 py-3">
                <div className="font-medium">{e.name}</div>
                <div className="text-sm text-zinc-500">
                  {e.starts_on} – {e.ends_on} · {e.status}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
