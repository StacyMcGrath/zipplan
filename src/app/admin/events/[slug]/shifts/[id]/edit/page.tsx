import Link from "next/link";

import { requireShiftById } from "@/lib/admin-auth";
import {
  dateKeyInZone,
  timeInputValueInZone,
} from "@/lib/datetime";
import { createAdminClient } from "@/lib/supabase/admin";

import ShiftForm from "../../shift-form";

type LocationOption = { id: string; name: string };
type RoleOption = { id: string; name: string; position: number };

export default async function EditShiftPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const { event, shift, location } = await requireShiftById(slug, id);

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
        href={`/admin/events/${event.slug}/shifts/${shift.id}`}
        className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
      >
        ← {location.name}
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        Edit shift
      </h1>
      <div className="mt-8">
        <ShiftForm
          mode="edit"
          shiftId={shift.id}
          eventSlug={event.slug}
          eventTimezone={event.timezone}
          locations={locations ?? []}
          roles={(roles ?? []).map((r) => ({ id: r.id, name: r.name }))}
          defaults={{
            location_id: shift.location_id,
            shift_role_id: shift.shift_role_id ?? "",
            role_label: shift.role_label ?? "",
            date: dateKeyInZone(shift.starts_at, event.timezone),
            starts_at: timeInputValueInZone(shift.starts_at, event.timezone),
            ends_at: timeInputValueInZone(shift.ends_at, event.timezone),
            capacity: shift.capacity,
            notes: shift.notes ?? "",
          }}
        />
      </div>
    </main>
  );
}
