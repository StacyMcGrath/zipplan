import { promises as fs } from "node:fs";
import path from "node:path";

import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

// Dev-only seed for the Pan Ohio Hope Ride 2026 pilot.
// - Looks up the event by slug (default: pan-ohio-hope-ride-2026)
// - Idempotently creates location_types ("Start/Finish Venue", "Rest Stop")
//   and their field_definitions (city, address, what3words, sponsoring_group,
//   contact_name, contact_phone, permit_info, setup_instructions)
// - Reads scripts/seed/pan-ohio-2026-stops.tsv and inserts each location.
//   Day/time columns are intentionally ignored — those drive shifts, not
//   locations (per architecture memory).
//
// Re-run anytime; existing rows are detected by name + event and skipped.
// Returns a JSON summary of what was inserted vs skipped.
//
// Usage: GET /api/dev/seed-pan-ohio  (or with ?event=other-slug)

type FieldKind =
  | "text"
  | "multiline"
  | "phone"
  | "email"
  | "url"
  | "number"
  | "date"
  | "datetime"
  | "what3words"
  | "select"
  | "multiselect";

type FieldDef = { key: string; label: string; kind: FieldKind };

const LOCATION_TYPES = ["Start/Finish Venue", "Rest Stop"] as const;
type LocationTypeName = (typeof LOCATION_TYPES)[number];

// Same field set on both types for now. When type-specific fields appear
// (e.g. overnight info on venues, water source on rest stops), split this.
const SHARED_FIELDS: FieldDef[] = [
  { key: "city", label: "City", kind: "text" },
  { key: "address", label: "Address", kind: "text" },
  { key: "what3words", label: "what3words", kind: "what3words" },
  { key: "sponsoring_group", label: "Sponsoring Group", kind: "text" },
  { key: "contact_name", label: "Contact Name", kind: "text" },
  { key: "contact_phone", label: "Contact Phone", kind: "phone" },
  { key: "permit_info", label: "Permit Info", kind: "multiline" },
  {
    key: "setup_instructions",
    label: "Setup Instructions",
    kind: "multiline",
  },
];

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not available in production", { status: 404 });
  }

  const url = new URL(request.url);
  const eventSlug =
    url.searchParams.get("event") ?? "pan-ohio-hope-ride-2026";

  const admin = createAdminClient();

  // Look up event
  const { data: event, error: eventError } = await admin
    .from("events")
    .select("id, name, slug")
    .eq("slug", eventSlug)
    .maybeSingle();

  if (eventError) {
    return NextResponse.json({ error: eventError.message }, { status: 500 });
  }
  if (!event) {
    return NextResponse.json(
      {
        error: `No event with slug "${eventSlug}". Create the event via /admin/events/new first, then re-run.`,
      },
      { status: 404 },
    );
  }

  // 1. Upsert location_types
  const typeIds: Record<LocationTypeName, string> = {} as Record<
    LocationTypeName,
    string
  >;
  for (const [position, name] of LOCATION_TYPES.entries()) {
    const existing = await admin
      .from("location_types")
      .select("id")
      .eq("event_id", event.id)
      .eq("name", name)
      .maybeSingle();

    if (existing.data) {
      typeIds[name] = existing.data.id;
      continue;
    }

    const inserted = await admin
      .from("location_types")
      .insert({ event_id: event.id, name, position })
      .select("id")
      .single();

    if (inserted.error || !inserted.data) {
      return NextResponse.json(
        { error: inserted.error?.message ?? "Failed to insert location_type" },
        { status: 500 },
      );
    }
    typeIds[name] = inserted.data.id;
  }

  // 2. Upsert field_definitions for each type
  let fieldsInserted = 0;
  for (const typeName of LOCATION_TYPES) {
    for (const [position, def] of SHARED_FIELDS.entries()) {
      const existing = await admin
        .from("field_definitions")
        .select("id")
        .eq("location_type_id", typeIds[typeName])
        .eq("key", def.key)
        .maybeSingle();
      if (existing.data) continue;

      const inserted = await admin.from("field_definitions").insert({
        location_type_id: typeIds[typeName],
        key: def.key,
        label: def.label,
        kind: def.kind,
        required: false,
        position,
      });
      if (inserted.error) {
        return NextResponse.json(
          { error: inserted.error.message },
          { status: 500 },
        );
      }
      fieldsInserted++;
    }
  }

  // 3. Read TSV and insert locations
  const tsvPath = path.join(
    process.cwd(),
    "scripts",
    "seed",
    "pan-ohio-2026-stops.tsv",
  );
  const tsv = await fs.readFile(tsvPath, "utf-8");
  const lines = tsv.split("\n").filter((l) => l.trim().length > 0);
  const headers = lines[0].split("\t").map((h) => h.trim());

  let locationsInserted = 0;
  let locationsSkipped = 0;
  const errors: string[] = [];

  for (const line of lines.slice(1)) {
    const cols = line.split("\t");
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (cols[i] ?? "").trim();
    });

    const name = row.STOP;
    if (!name) continue;

    // Heuristic: rows with SETUP_TIME are along-the-route Rest Stops;
    // venues without a setup time are Start/Finish Venues.
    const isRestStop = row.SETUP_TIME.length > 0;
    const typeName: LocationTypeName = isRestStop
      ? "Rest Stop"
      : "Start/Finish Venue";

    const existing = await admin
      .from("locations")
      .select("id")
      .eq("event_id", event.id)
      .eq("name", name)
      .maybeSingle();
    if (existing.data) {
      locationsSkipped++;
      continue;
    }

    const attributes: Record<string, string> = {};
    if (row.CITY) attributes.city = row.CITY;
    if (row.ADDRESS) attributes.address = row.ADDRESS;
    if (row.W3W) attributes.what3words = row.W3W;
    if (row.SPONSORING_GROUP) attributes.sponsoring_group = row.SPONSORING_GROUP;

    const { error } = await admin.from("locations").insert({
      event_id: event.id,
      location_type_id: typeIds[typeName],
      name,
      attributes,
    });

    if (error) {
      errors.push(`${name}: ${error.message}`);
      continue;
    }
    locationsInserted++;
  }

  return NextResponse.json({
    ok: true,
    event: { slug: event.slug, name: event.name },
    location_types: LOCATION_TYPES.length,
    field_definitions_inserted: fieldsInserted,
    locations_inserted: locationsInserted,
    locations_skipped: locationsSkipped,
    errors,
  });
}
