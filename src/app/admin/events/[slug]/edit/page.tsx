import Link from "next/link";

import { requireEventBySlug } from "@/lib/admin-auth";

import EventForm from "../../event-form";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { event } = await requireEventBySlug(slug);

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <Link
        href={`/admin/events/${event.slug}`}
        className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
      >
        ← {event.name}
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        Edit event
      </h1>
      <div className="mt-8">
        <EventForm
          mode="edit"
          defaults={{
            slug: event.slug,
            name: event.name,
            starts_on: event.starts_on,
            ends_on: event.ends_on,
            timezone: event.timezone,
            status: event.status,
          }}
        />
      </div>
    </main>
  );
}
