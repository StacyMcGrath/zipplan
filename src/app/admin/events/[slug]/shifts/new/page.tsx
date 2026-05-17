import Link from "next/link";

import { requireEventBySlug } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

import ShiftForm from "../shift-form";

type LocationOption = { id: string; name: string };
type RoleOption = { id: string; name: string; position: number };

export default async function NewShiftPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ location?: string; date?: string }>;
}) {
  const { slug } = await params;
  const { location: presetLocation, date: presetDate } = await searchParams;
  const { event } = await requireEventBySlug(slug);

  const admin = createAdminClient();

  const [{ data: locations }, { data: roles }] = await Promise.all([
    admin
      .from("locations")
      .select("id, name")
      .eq("event_id", event.id)
      .order("name", { ascending: true })
      .returns<LocationOption[]>(),
    admin
      .from("shift_roles")
      .select("id, name, position")
      .eq("event_id", event.id)
      .order("position", { ascending: true })
      .returns<RoleOption[]>(),
  ]);

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <Link
        href={`/admin/events/${event.slug}/shifts`}
        className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
      >
        ← Shifts
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        New shift
      </h1>
      <div className="mt-8">
        <ShiftForm
          mode="new"
          eventSlug={event.slug}
          eventTimezone={event.timezone}
          locations={locations ?? []}
          roles={(roles ?? []).map((r) => ({ id: r.id, name: r.name }))}
          defaults={{
            location_id: presetLocation ?? "",
            shift_role_id: "",
            role_label: "",
            date: presetDate ?? "",
            starts_at: "",
            ends_at: "",
            capacity: 1,
            notes: "",
          }}
        />
      </div>
    </main>
  );
}
