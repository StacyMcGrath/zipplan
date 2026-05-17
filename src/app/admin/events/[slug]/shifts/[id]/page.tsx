import Link from "next/link";

import { requireShiftById } from "@/lib/admin-auth";
import {
  formatLongDateInZone,
  formatTimeInZone,
} from "@/lib/datetime";

export default async function ShiftDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const { event, shift, location, locationType, shiftRole } =
    await requireShiftById(slug, id);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <Link
        href={`/admin/events/${event.slug}/shifts`}
        className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
      >
        ← Shifts
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {location.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-zinc-500">
            <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {locationType.name}
            </span>
            {shiftRole && (
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                {shiftRole.name}
              </span>
            )}
          </div>
        </div>
        <Link
          href={`/admin/events/${event.slug}/shifts/${shift.id}/edit`}
          className="inline-flex h-9 items-center rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
        >
          Edit
        </Link>
      </div>

      <dl className="mt-8 divide-y divide-zinc-200 overflow-hidden rounded-md border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
        <Row label="Day">
          {formatLongDateInZone(shift.starts_at, event.timezone)}
        </Row>
        <Row label="Time">
          {formatTimeInZone(shift.starts_at, event.timezone)} –{" "}
          {formatTimeInZone(shift.ends_at, event.timezone)} ({event.timezone})
        </Row>
        <Row label="Role">{shift.role_label ?? "—"}</Row>
        <Row label="Capacity">{shift.capacity}</Row>
        <Row label="Location">
          <Link
            href={`/admin/events/${event.slug}/locations/${location.id}`}
            className="text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-50"
          >
            {location.name}
          </Link>
        </Row>
        {shift.notes && <Row label="Notes">{shift.notes}</Row>}
      </dl>

      {shiftRole?.instructions && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold tracking-tight">
            Role instructions
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
            {shiftRole.instructions}
          </p>
        </section>
      )}

      <section className="mt-10">
        <h2 className="text-sm font-semibold tracking-tight">Assignments</h2>
        <p className="mt-2 text-sm text-zinc-500">
          No assignments yet. Volunteers + assignment UI ships in a later
          session.
        </p>
      </section>
    </main>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-3 gap-4 px-4 py-3">
      <dt className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </dt>
      <dd className="col-span-2 text-sm text-zinc-900 dark:text-zinc-50">
        {children}
      </dd>
    </div>
  );
}
