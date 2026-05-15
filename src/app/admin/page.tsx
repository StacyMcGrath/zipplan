import Link from "next/link";
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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {membership.organization.name}
            </h1>
            <Link
              href="/admin/organization"
              title="Edit organization"
              className="text-sm text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50"
            >
              Edit
            </Link>
          </div>
          <p className="mt-1 text-sm text-zinc-500">Events</p>
        </div>
        <Link
          href="/admin/events/new"
          className="inline-flex h-9 items-center rounded-md bg-zinc-900 px-3 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          + New event
        </Link>
      </div>

      <div className="mt-8">
        {list.length === 0 ? (
          <div className="rounded-md border border-dashed border-zinc-300 px-6 py-12 text-center text-sm text-zinc-500 dark:border-zinc-700">
            No events yet.{" "}
            <Link
              href="/admin/events/new"
              className="font-medium text-zinc-900 underline dark:text-zinc-50"
            >
              Create your first event
            </Link>
            .
          </div>
        ) : (
          <ul className="divide-y divide-zinc-200 overflow-hidden rounded-md border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
            {list.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/admin/events/${e.slug}`}
                  className="block px-4 py-3 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900"
                >
                  <div className="font-medium">{e.name}</div>
                  <div className="text-sm text-zinc-500">
                    {e.starts_on} – {e.ends_on} · {e.status}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
