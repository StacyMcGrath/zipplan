import Link from "next/link";

import {
  requireLocationById,
  type AdminFieldDefinition,
} from "@/lib/admin-auth";

export default async function LocationDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const { event, location, locationType, fieldDefinitions } =
    await requireLocationById(slug, id);

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10">
      <Link
        href={`/admin/events/${event.slug}/locations`}
        className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
      >
        ← Locations
      </Link>

      <div className="mt-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {location.name}
          </h1>
          <div className="mt-2 inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
            {locationType.name}
          </div>
        </div>
        <Link
          href={`/admin/events/${event.slug}/locations/${location.id}/edit`}
          className="inline-flex h-9 items-center rounded-md border border-zinc-300 px-3 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-900"
        >
          Edit
        </Link>
      </div>

      <dl className="mt-8 divide-y divide-zinc-200 overflow-hidden rounded-md border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-950">
        {fieldDefinitions.length === 0 ? (
          <div className="px-4 py-3 text-sm text-zinc-500">
            No fields defined for this location type.
          </div>
        ) : (
          fieldDefinitions.map((def) => (
            <FieldRow
              key={def.id}
              def={def}
              value={location.attributes[def.key]}
            />
          ))
        )}
      </dl>

      {location.notes && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold tracking-tight">Notes</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
            {location.notes}
          </p>
        </section>
      )}
    </main>
  );
}

function FieldRow({
  def,
  value,
}: {
  def: AdminFieldDefinition;
  value: unknown;
}) {
  const isEmpty =
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim().length === 0);

  return (
    <div className="grid grid-cols-3 gap-4 px-4 py-3">
      <dt className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {def.label}
      </dt>
      <dd className="col-span-2 text-sm text-zinc-900 dark:text-zinc-50">
        {isEmpty ? (
          <span className="text-zinc-400">—</span>
        ) : (
          renderValue(def.kind, value)
        )}
      </dd>
    </div>
  );
}

function renderValue(kind: AdminFieldDefinition["kind"], value: unknown) {
  const text = typeof value === "string" ? value : String(value ?? "");
  if (kind === "phone") {
    return (
      <a
        href={`tel:${text.replace(/[^0-9+]/g, "")}`}
        className="text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-50"
      >
        {text}
      </a>
    );
  }
  if (kind === "email") {
    return (
      <a
        href={`mailto:${text}`}
        className="text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-50"
      >
        {text}
      </a>
    );
  }
  if (kind === "url") {
    return (
      <a
        href={text}
        target="_blank"
        rel="noopener noreferrer"
        className="text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-50"
      >
        {text}
      </a>
    );
  }
  if (kind === "what3words") {
    return (
      <a
        href={`https://what3words.com/${text}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-zinc-900 underline-offset-2 hover:underline dark:text-zinc-50"
      >
        ///{text}
      </a>
    );
  }
  if (kind === "multiline") {
    return <span className="whitespace-pre-wrap">{text}</span>;
  }
  return text;
}
