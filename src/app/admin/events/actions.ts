"use server";

import { redirect } from "next/navigation";

import { getCurrentMembership, requireUser } from "@/lib/admin-auth";
import { findAvailableSlug, slugify } from "@/lib/slug";
import { createAdminClient } from "@/lib/supabase/admin";

import { isValidTimezone } from "./timezones";

export type EventFormState = {
  error?: string;
  fieldErrors?: Partial<
    Record<"name" | "starts_on" | "ends_on" | "timezone" | "status", string>
  >;
};

const STATUSES = ["draft", "active", "archived"] as const;
type Status = (typeof STATUSES)[number];

function isValidDate(value: string): boolean {
  // Accepts only YYYY-MM-DD; rejects empty / partial / malformed dates
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

function parseFields(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const starts_on = String(formData.get("starts_on") ?? "").trim();
  const ends_on = String(formData.get("ends_on") ?? "").trim();
  const timezone = String(formData.get("timezone") ?? "").trim();
  const status = String(formData.get("status") ?? "draft").trim();
  return { name, starts_on, ends_on, timezone, status };
}

function validate(
  fields: ReturnType<typeof parseFields>,
  { requireStatus }: { requireStatus: boolean },
): EventFormState["fieldErrors"] | null {
  const errors: NonNullable<EventFormState["fieldErrors"]> = {};

  if (fields.name.length < 2 || fields.name.length > 100) {
    errors.name = "Name must be 2–100 characters.";
  }
  if (!isValidDate(fields.starts_on)) {
    errors.starts_on = "Pick a start date.";
  }
  if (!isValidDate(fields.ends_on)) {
    errors.ends_on = "Pick an end date.";
  }
  if (
    isValidDate(fields.starts_on) &&
    isValidDate(fields.ends_on) &&
    fields.ends_on < fields.starts_on
  ) {
    errors.ends_on = "End date must be on or after the start date.";
  }
  if (!isValidTimezone(fields.timezone)) {
    errors.timezone = "Pick a timezone from the list.";
  }
  if (
    requireStatus &&
    !(STATUSES as readonly string[]).includes(fields.status)
  ) {
    errors.status = "Invalid status.";
  }

  return Object.keys(errors).length ? errors : null;
}

export async function createEvent(
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  await requireUser();
  const membership = await getCurrentMembership();
  if (!membership) return { error: "No organization in scope." };

  const fields = parseFields(formData);
  const fieldErrors = validate(fields, { requireStatus: false });
  if (fieldErrors) return { fieldErrors };

  const admin = createAdminClient();
  const slug = await findAvailableSlug(admin, "events", slugify(fields.name), {
    column: "organization_id",
    value: membership.organization_id,
  });

  const { error } = await admin.from("events").insert({
    organization_id: membership.organization_id,
    name: fields.name,
    slug,
    starts_on: fields.starts_on,
    ends_on: fields.ends_on,
    timezone: fields.timezone,
    // status defaults to 'draft' in the schema
  });

  if (error) return { error: error.message };

  redirect(`/admin/events/${slug}`);
}

export async function updateEvent(
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  await requireUser();
  const membership = await getCurrentMembership();
  if (!membership) return { error: "No organization in scope." };

  const slug = String(formData.get("slug") ?? "").trim();
  if (!slug) return { error: "Missing event slug." };

  const fields = parseFields(formData);
  const fieldErrors = validate(fields, { requireStatus: true });
  if (fieldErrors) return { fieldErrors };

  const admin = createAdminClient();
  const { error } = await admin
    .from("events")
    .update({
      name: fields.name,
      starts_on: fields.starts_on,
      ends_on: fields.ends_on,
      timezone: fields.timezone,
      status: fields.status as Status,
    })
    .eq("organization_id", membership.organization_id)
    .eq("slug", slug);

  if (error) return { error: error.message };

  redirect(`/admin/events/${slug}`);
}
