import Link from "next/link";

import { requireLocationById } from "@/lib/admin-auth";

import LocationForm from "../../location-form";

export default async function EditLocationPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const { event, location, locationType, fieldDefinitions } =
    await requireLocationById(slug, id);

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <Link
        href={`/admin/events/${event.slug}/locations/${location.id}`}
        className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
      >
        ← {location.name}
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        Edit location
      </h1>
      <div className="mt-8">
        <LocationForm
          mode="edit"
          eventSlug={event.slug}
          locationId={location.id}
          locationTypeName={locationType.name}
          defaults={{
            name: location.name,
            notes: location.notes ?? "",
            attributes: location.attributes,
          }}
          fieldDefinitions={fieldDefinitions}
        />
      </div>
    </main>
  );
}
