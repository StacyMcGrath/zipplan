"use server";

import { redirect } from "next/navigation";

import {
  getCurrentMembership,
  requireEventBySlug,
} from "@/lib/admin-auth";
import {
  localToUtcIso,
  parseAmPmTime,
} from "@/lib/datetime";
import { createAdminClient } from "@/lib/supabase/admin";

export type ShiftFormState = {
  error?: string;
  fieldErrors?: Partial<
    Record<
      | "location_id"
      | "shift_role_id"
      | "starts_on"
      | "starts_at"
      | "ends_at"
      | "capacity"
      | "role_label",
      string
    >
  >;
};

function parseTimeInput(value: string): [number, number] {
  // <input type="time"> emits "HH:MM" in 24-hour format
  const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) {
    // Tolerate "h:mm AM/PM" too, in case a user typed in the seed format
    return parseAmPmTime(value);
  }
  return [Number(match[1]), Number(match[2])];
}

function parseDateInput(value: string): [number, number, number] {
  // <input type="date"> emits "YYYY-MM-DD"
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error(`Could not parse date: "${value}"`);
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function parseFields(formData: FormData) {
  return {
    location_id: String(formData.get("location_id") ?? "").trim(),
    shift_role_id: String(formData.get("shift_role_id") ?? "").trim(),
    role_label: String(formData.get("role_label") ?? "").trim(),
    date: String(formData.get("date") ?? "").trim(),
    starts_at: String(formData.get("starts_at") ?? "").trim(),
    ends_at: String(formData.get("ends_at") ?? "").trim(),
    capacity: String(formData.get("capacity") ?? "1").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
  };
}

function validate(
  fields: ReturnType<typeof parseFields>,
): ShiftFormState["fieldErrors"] | null {
  const errors: NonNullable<ShiftFormState["fieldErrors"]> = {};
  if (!fields.location_id) errors.location_id = "Pick a location.";
  if (!fields.date) errors.starts_on = "Pick a date.";
  if (!fields.starts_at) errors.starts_at = "Pick a start time.";
  if (!fields.ends_at) errors.ends_at = "Pick an end time.";
  const cap = Number(fields.capacity);
  if (!Number.isFinite(cap) || cap < 1) {
    errors.capacity = "Capacity must be 1 or more.";
  }
  return Object.keys(errors).length ? errors : null;
}

export async function createShift(
  _prev: ShiftFormState,
  formData: FormData,
): Promise<ShiftFormState> {
  const eventSlug = String(formData.get("eventSlug") ?? "");
  if (!eventSlug) return { error: "Missing event." };

  const { event } = await requireEventBySlug(eventSlug);
  const membership = await getCurrentMembership();
  if (!membership) return { error: "No organization in scope." };

  const fields = parseFields(formData);
  const fieldErrors = validate(fields);
  if (fieldErrors) return { fieldErrors };

  const admin = createAdminClient();

  // Verify the location belongs to this event
  const { data: location } = await admin
    .from("locations")
    .select("id")
    .eq("id", fields.location_id)
    .eq("event_id", event.id)
    .maybeSingle();
  if (!location) {
    return { fieldErrors: { location_id: "Invalid location for this event." } };
  }

  let startsAt: string;
  let endsAt: string;
  try {
    const [year, month, day] = parseDateInput(fields.date);
    const [startH, startM] = parseTimeInput(fields.starts_at);
    const [endH, endM] = parseTimeInput(fields.ends_at);
    startsAt = localToUtcIso(year, month, day, startH, startM, event.timezone);
    endsAt = localToUtcIso(year, month, day, endH, endM, event.timezone);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { error: message };
  }

  if (endsAt <= startsAt) {
    return { fieldErrors: { ends_at: "End time must be after start time." } };
  }

  // Optional shift_role_id — only set if non-empty AND valid for this event
  let shiftRoleId: string | null = null;
  if (fields.shift_role_id) {
    const { data: role } = await admin
      .from("shift_roles")
      .select("id")
      .eq("id", fields.shift_role_id)
      .eq("event_id", event.id)
      .maybeSingle();
    if (!role) {
      return {
        fieldErrors: { shift_role_id: "Invalid role for this event." },
      };
    }
    shiftRoleId = role.id;
  }

  const { data: inserted, error } = await admin
    .from("shifts")
    .insert({
      location_id: fields.location_id,
      shift_role_id: shiftRoleId,
      role_label: fields.role_label || null,
      starts_at: startsAt,
      ends_at: endsAt,
      capacity: Number(fields.capacity),
      notes: fields.notes || null,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return { error: error?.message ?? "Failed to create shift." };
  }

  redirect(`/admin/events/${event.slug}/shifts/${inserted.id}`);
}

export async function updateShift(
  _prev: ShiftFormState,
  formData: FormData,
): Promise<ShiftFormState> {
  const eventSlug = String(formData.get("eventSlug") ?? "");
  const shiftId = String(formData.get("shiftId") ?? "");
  if (!eventSlug || !shiftId) {
    return { error: "Missing event or shift." };
  }

  const { event } = await requireEventBySlug(eventSlug);
  const membership = await getCurrentMembership();
  if (!membership) return { error: "No organization in scope." };

  const fields = parseFields(formData);
  const fieldErrors = validate(fields);
  if (fieldErrors) return { fieldErrors };

  const admin = createAdminClient();

  // Verify the shift belongs to this event (via location)
  const { data: existing } = await admin
    .from("shifts")
    .select("id, location_id, locations!inner(event_id)")
    .eq("id", shiftId)
    .maybeSingle();
  if (
    !existing ||
    (existing.locations as unknown as { event_id: string }).event_id !==
      event.id
  ) {
    return { error: "Shift not found." };
  }

  // Verify (possibly new) location belongs to this event
  const { data: location } = await admin
    .from("locations")
    .select("id")
    .eq("id", fields.location_id)
    .eq("event_id", event.id)
    .maybeSingle();
  if (!location) {
    return { fieldErrors: { location_id: "Invalid location for this event." } };
  }

  let startsAt: string;
  let endsAt: string;
  try {
    const [year, month, day] = parseDateInput(fields.date);
    const [startH, startM] = parseTimeInput(fields.starts_at);
    const [endH, endM] = parseTimeInput(fields.ends_at);
    startsAt = localToUtcIso(year, month, day, startH, startM, event.timezone);
    endsAt = localToUtcIso(year, month, day, endH, endM, event.timezone);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { error: message };
  }

  if (endsAt <= startsAt) {
    return { fieldErrors: { ends_at: "End time must be after start time." } };
  }

  let shiftRoleId: string | null = null;
  if (fields.shift_role_id) {
    const { data: role } = await admin
      .from("shift_roles")
      .select("id")
      .eq("id", fields.shift_role_id)
      .eq("event_id", event.id)
      .maybeSingle();
    if (!role) {
      return {
        fieldErrors: { shift_role_id: "Invalid role for this event." },
      };
    }
    shiftRoleId = role.id;
  }

  const { error } = await admin
    .from("shifts")
    .update({
      location_id: fields.location_id,
      shift_role_id: shiftRoleId,
      role_label: fields.role_label || null,
      starts_at: startsAt,
      ends_at: endsAt,
      capacity: Number(fields.capacity),
      notes: fields.notes || null,
    })
    .eq("id", shiftId);

  if (error) return { error: error.message };

  redirect(`/admin/events/${event.slug}/shifts/${shiftId}`);
}
