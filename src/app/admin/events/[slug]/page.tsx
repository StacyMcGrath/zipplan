import Link from "next/link";

import { requireEventBySlug } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const STATUS_STYLES: Record<string, string> = {
  draft:
    "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  active:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  archived:
    "bg-zinc-200 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-500",
};

function formatDateRange(starts: string, ends: string): string {
  const start = new Date(`${starts}T00:00:00`);
  const end = new Date(`${ends}T00:00:00`);
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  const sameDay = sameMonth && start.getDate() === end.getDate();

  const fullFmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (sameDay) {
    return fullFmt.format(start);
  }

  if (sameMonth) {
    // "Jul 22–26, 2026"
    const month = new Intl.DateTimeFormat("en-US", { month: "short" }).format(
      start,
    );
    return `${month} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`;
  }

  if (sameYear) {
    // "Dec 30 – Jan 2, 2026" (same year, different month)
    const startFmt = new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(start);
    return `${startFmt} – ${fullFmt.format(end)}`;
  }

  // Different years: "Dec 30, 2025 – Jan 2, 2026"
  return `${fullFmt.format(start)} – ${fullFmt.format(end)}`;
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { event, membership } = await requireEventBySlug(slug);

  const admin = createAdminClient();
  const { count: locationsCount } = await admin
    .from("locations")
    .select("id", { head: true, count: "exact" })
    .eq("event_id", event.id);

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10">
      <Link
        href="/admin"
        className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
      >
        ← {membership.organization.name}
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {event.name}
          </h1>
          <div className="mt-2 flex items-center gap-3 text-sm text-zinc-600 dark:text-zinc-400">
            <span>{formatDateRange(event.starts_on, event.ends_on)}</span>
            <span className="text-zinc-300 dark:text-zinc-700">·</span>
            <span>{event.timezone}</span>
            <span className="text-zinc-300 dark:text-zinc-700">·</span>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                STATUS_STYLES[event.status] ?? STATUS_STYLES.draft
              }`}
            >
              {event.status}
            </span>
          </div>
        </div>
        <Link
          href={`/admin/events/${event.slug}/edit`}
          className="inline-flex h-9 items-center rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
        >
          Edit
        </Link>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <ActiveSection
          title="Locations"
          subtitle={
            locationsCount === null
              ? "—"
              : `${locationsCount} ${
                  locationsCount === 1 ? "location" : "locations"
                }`
          }
          href={`/admin/events/${event.slug}/locations`}
        />
        <PlaceholderSection title="Volunteers" />
        <PlaceholderSection title="Resources" />
      </div>
    </main>
  );
}

function ActiveSection({
  title,
  subtitle,
  href,
}: {
  title: string;
  subtitle: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-md border border-zinc-200 bg-white px-5 py-6 transition-colors hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
    >
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 text-sm text-zinc-500">{subtitle}</p>
    </Link>
  );
}

function PlaceholderSection({ title }: { title: string }) {
  return (
    <section className="rounded-md border border-dashed border-zinc-300 bg-white px-5 py-6 dark:border-zinc-700 dark:bg-zinc-950">
      <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
      <p className="mt-2 text-sm text-zinc-500">Coming next.</p>
    </section>
  );
}
