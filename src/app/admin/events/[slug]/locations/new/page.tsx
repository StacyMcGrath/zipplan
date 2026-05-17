import Link from "next/link";

import {
  requireEventBySlug,
  type AdminFieldDefinition,
} from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

import LocationForm from "../location-form";

type LocationType = {
  id: string;
  name: string;
  position: number;
};

export default async function NewLocationPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { slug } = await params;
  const { type } = await searchParams;
  const { event } = await requireEventBySlug(slug);

  const admin = createAdminClient();
  const { data: typesData } = await admin
    .from("location_types")
    .select("id, name, position")
    .eq("event_id", event.id)
    .order("position", { ascending: true })
    .returns<LocationType[]>();

  const types = typesData ?? [];

  if (types.length === 0) {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-10">
        <Link
          href={`/admin/events/${event.slug}/locations`}
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
        >
          ← Locations
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight">
          New location
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          No location types defined for this event yet. Run the seed script
          (or, when the field-defs editor lands, set them up here) before
          adding locations.
        </p>
      </main>
    );
  }

  const selectedTypeId =
    type && types.some((t) => t.id === type) ? type : types[0].id;

  const { data: defsData } = await admin
    .from("field_definitions")
    .select(
      "id, location_type_id, key, label, kind, required, position, help_text, options",
    )
    .eq("location_type_id", selectedTypeId)
    .order("position", { ascending: true })
    .returns<AdminFieldDefinition[]>();

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <Link
        href={`/admin/events/${event.slug}/locations`}
        className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
      >
        ← Locations
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        New location
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        Pick a type to see its fields. Type can&rsquo;t be changed after
        creation.
      </p>
      <div className="mt-8">
        <LocationForm
          mode="new"
          eventSlug={event.slug}
          locationTypes={types.map((t) => ({ id: t.id, name: t.name }))}
          selectedTypeId={selectedTypeId}
          fieldDefinitions={defsData ?? []}
        />
      </div>
    </main>
  );
}
