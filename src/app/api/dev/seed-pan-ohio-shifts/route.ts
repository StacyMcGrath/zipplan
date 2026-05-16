import { promises as fs } from "node:fs";
import path from "node:path";

import { NextResponse, type NextRequest } from "next/server";

import {
  localToUtcIso,
  parseAmPmTime,
  parseShortDate,
} from "@/lib/datetime";
import { createAdminClient } from "@/lib/supabase/admin";

// Dev-only seed for Pan Ohio Hope Ride 2026 shifts.
// - Looks up the event (default: pan-ohio-hope-ride-2026) and reads the same
//   TSV that the locations seeder uses
// - Idempotently creates a shift_role "Rest Stop Crew"
// - For each row that has a SETUP_TIME, finds the matching location by
//   name+event and creates a shift with starts_at = setup time, ends_at =
//   departure time (or last rider, if departure is missing). Uses the
//   event's timezone for conversion to UTC.
// - Idempotent: existing (location_id, starts_at) pairs are skipped.
// - Start/Finish Venues get no shifts here — admin will add them via CRUD.
//
// Usage: GET /api/dev/seed-pan-ohio-shifts  (or with ?event=other-slug)

const REST_STOP_TYPE_NAME = "Rest Stop";
const SHIFT_ROLE_NAME = "Rest Stop Crew";
const SHIFT_ROLE_INSTRUCTIONS =
  "Set up the rest stop area, distribute water/snacks to riders as they arrive, " +
  "track approximate rider counts, and pack up after the last rider departs. " +
  "Coordinate with your stop lead for any local specifics.";

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Not available in production", { status: 404 });
  }

  const url = new URL(request.url);
  const eventSlug =
    url.searchParams.get("event") ?? "pan-ohio-hope-ride-2026";

  const admin = createAdminClient();

  // 1. Look up event (need timezone for date math)
  const { data: event, error: eventError } = await admin
    .from("events")
    .select("id, name, slug, timezone")
    .eq("slug", eventSlug)
    .maybeSingle();

  if (eventError) {
    return NextResponse.json({ error: eventError.message }, { status: 500 });
  }
  if (!event) {
    return NextResponse.json(
      {
        error: `No event with slug "${eventSlug}". Create it (and seed locations) first.`,
      },
      { status: 404 },
    );
  }

  // 2. Look up the Rest Stop location_type so we can scope the location
  //    lookup correctly (avoids accidentally matching a venue with the
  //    same name in some bizarre future case).
  const { data: restStopType } = await admin
    .from("location_types")
    .select("id")
    .eq("event_id", event.id)
    .eq("name", REST_STOP_TYPE_NAME)
    .maybeSingle();

  if (!restStopType) {
    return NextResponse.json(
      {
        error: `No "${REST_STOP_TYPE_NAME}" location_type for this event. Run /api/dev/seed-pan-ohio first.`,
      },
      { status: 400 },
    );
  }

  // 3. Upsert the shift_role
  let shiftRoleId: string | null = null;
  const existingRole = await admin
    .from("shift_roles")
    .select("id")
    .eq("event_id", event.id)
    .eq("name", SHIFT_ROLE_NAME)
    .maybeSingle();

  if (existingRole.data) {
    shiftRoleId = existingRole.data.id;
  } else {
    const inserted = await admin
      .from("shift_roles")
      .insert({
        event_id: event.id,
        name: SHIFT_ROLE_NAME,
        instructions: SHIFT_ROLE_INSTRUCTIONS,
        position: 0,
      })
      .select("id")
      .single();
    if (inserted.error || !inserted.data) {
      return NextResponse.json(
        { error: inserted.error?.message ?? "Failed to insert shift_role" },
        { status: 500 },
      );
    }
    shiftRoleId = inserted.data.id;
  }

  // 4. Read TSV
  const tsvPath = path.join(
    process.cwd(),
    "scripts",
    "seed",
    "pan-ohio-2026-stops.tsv",
  );
  const tsv = await fs.readFile(tsvPath, "utf-8");
  const lines = tsv.split("\n").filter((l) => l.trim().length > 0);
  const headers = lines[0].split("\t").map((h) => h.trim());

  let shiftsInserted = 0;
  let shiftsSkipped = 0;
  const errors: string[] = [];

  for (const line of lines.slice(1)) {
    const cols = line.split("\t");
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = (cols[i] ?? "").trim();
    });

    if (!row.SETUP_TIME) continue; // skip Start/Finish Venues
    if (!row.STOP || !row.DAY) continue;

    // Find the location for this row, scoped to event + Rest Stop type
    const { data: location } = await admin
      .from("locations")
      .select("id")
      .eq("event_id", event.id)
      .eq("location_type_id", restStopType.id)
      .eq("name", row.STOP)
      .maybeSingle();

    if (!location) {
      errors.push(`No Rest Stop location found for "${row.STOP}"`);
      continue;
    }

    // Build start/end timestamps in the event's timezone
    let startsAt: string;
    let endsAt: string;
    try {
      const [year, month, day] = parseShortDate(row.DAY);
      const [startH, startM] = parseAmPmTime(row.SETUP_TIME);
      const endTimeStr = row.DEPARTURE || row.LAST_RIDER;
      if (!endTimeStr) {
        errors.push(`${row.STOP}: missing DEPARTURE and LAST_RIDER`);
        continue;
      }
      const [endH, endM] = parseAmPmTime(endTimeStr);

      startsAt = localToUtcIso(
        year,
        month,
        day,
        startH,
        startM,
        event.timezone,
      );
      endsAt = localToUtcIso(year, month, day, endH, endM, event.timezone);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      errors.push(`${row.STOP}: ${message}`);
      continue;
    }

    // Idempotency: skip if a shift already exists at this location starting
    // at the same time. Avoids dupes on re-run.
    const existingShift = await admin
      .from("shifts")
      .select("id")
      .eq("location_id", location.id)
      .eq("starts_at", startsAt)
      .maybeSingle();

    if (existingShift.data) {
      shiftsSkipped++;
      continue;
    }

    const { error } = await admin.from("shifts").insert({
      location_id: location.id,
      shift_role_id: shiftRoleId,
      role_label: SHIFT_ROLE_NAME,
      starts_at: startsAt,
      ends_at: endsAt,
      capacity: 1,
    });

    if (error) {
      errors.push(`${row.STOP}: ${error.message}`);
      continue;
    }
    shiftsInserted++;
  }

  return NextResponse.json({
    ok: true,
    event: { slug: event.slug, name: event.name, timezone: event.timezone },
    shift_role: SHIFT_ROLE_NAME,
    shifts_inserted: shiftsInserted,
    shifts_skipped: shiftsSkipped,
    errors,
  });
}
