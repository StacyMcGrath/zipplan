"use server";

import { redirect } from "next/navigation";

import {
  getCurrentMembership,
  requireEventBySlug,
  type AdminFieldDefinition,
} from "@/lib/admin-auth";
import { attributeKeyFromFormName } from "@/lib/dynamic-field-input";
import { createAdminClient } from "@/lib/supabase/admin";

export type LocationFormState = {
  error?: string;
  fieldErrors?: { name?: string; type?: string };
  attributeErrors?: Record<string, string>;
};

function buildAttributesFromFormData(
  formData: FormData,
  defs: AdminFieldDefinition[],
): {
  attributes: Record<string, unknown>;
  errors: Record<string, string>;
} {
  const attributes: Record<string, unknown> = {};
  const errors: Record<string, string> = {};
  const defByKey = new Map(defs.map((d) => [d.key, d] as const));

  for (const [name, raw] of formData.entries()) {
    const key = attributeKeyFromFormName(name);
    if (!key) continue;
    if (typeof raw !== "string") continue;
    const value = raw.trim();
    const def = defByKey.get(key);
    if (!def) continue; // ignore extra fields not defined for this type

    if (!value) {
      if (def.required) {
        errors[def.key] = `${def.label} is required.`;
      }
      continue;
    }

    if (def.kind === "number") {
      const n = Number(value);
      if (!Number.isFinite(n)) {
        errors[def.key] = `${def.label} must be a number.`;
        continue;
      }
      attributes[key] = n;
    } else {
      attributes[key] = value;
    }
  }

  // Required defs that didn't appear in formData at all
  for (const def of defs) {
    if (def.required && !(def.key in attributes) && !(def.key in errors)) {
      errors[def.key] = `${def.label} is required.`;
    }
  }

  return { attributes, errors };
}

export async function createLocation(
  _prev: LocationFormState,
  formData: FormData,
): Promise<LocationFormState> {
  const eventSlug = String(formData.get("eventSlug") ?? "");
  if (!eventSlug) return { error: "Missing event." };

  const { event } = await requireEventBySlug(eventSlug);
  const membership = await getCurrentMembership();
  if (!membership) return { error: "No organization in scope." };

  const name = String(formData.get("name") ?? "").trim();
  const locationTypeId = String(formData.get("locationTypeId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  const fieldErrors: NonNullable<LocationFormState["fieldErrors"]> = {};
  if (name.length < 2 || name.length > 200) {
    fieldErrors.name = "Name must be 2–200 characters.";
  }
  if (!locationTypeId) {
    fieldErrors.type = "Pick a location type.";
  }

  const admin = createAdminClient();

  // Verify the location type belongs to this event
  const { data: type } = await admin
    .from("location_types")
    .select("id")
    .eq("id", locationTypeId)
    .eq("event_id", event.id)
    .maybeSingle();
  if (!type && locationTypeId) {
    fieldErrors.type = "Invalid location type for this event.";
  }

  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  // Pull field definitions for this type so we can validate + build attrs
  const { data: defsData } = await admin
    .from("field_definitions")
    .select(
      "id, location_type_id, key, label, kind, required, position, help_text, options",
    )
    .eq("location_type_id", locationTypeId)
    .returns<AdminFieldDefinition[]>();

  const { attributes, errors: attributeErrors } = buildAttributesFromFormData(
    formData,
    defsData ?? [],
  );
  if (Object.keys(attributeErrors).length > 0) {
    return { attributeErrors };
  }

  const { data: inserted, error } = await admin
    .from("locations")
    .insert({
      event_id: event.id,
      location_type_id: locationTypeId,
      name,
      attributes,
      notes: notes || null,
    })
    .select("id")
    .single();

  if (error || !inserted) {
    return { error: error?.message ?? "Failed to create location." };
  }

  redirect(`/admin/events/${event.slug}/locations/${inserted.id}`);
}

export async function updateLocation(
  _prev: LocationFormState,
  formData: FormData,
): Promise<LocationFormState> {
  const eventSlug = String(formData.get("eventSlug") ?? "");
  const locationId = String(formData.get("locationId") ?? "");
  if (!eventSlug || !locationId) {
    return { error: "Missing event or location." };
  }

  const { event } = await requireEventBySlug(eventSlug);
  const membership = await getCurrentMembership();
  if (!membership) return { error: "No organization in scope." };

  const name = String(formData.get("name") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  const fieldErrors: NonNullable<LocationFormState["fieldErrors"]> = {};
  if (name.length < 2 || name.length > 200) {
    fieldErrors.name = "Name must be 2–200 characters.";
  }
  if (Object.keys(fieldErrors).length > 0) return { fieldErrors };

  const admin = createAdminClient();

  // Re-verify the location belongs to this event (defensive)
  const { data: existing } = await admin
    .from("locations")
    .select("id, location_type_id")
    .eq("id", locationId)
    .eq("event_id", event.id)
    .maybeSingle();
  if (!existing) return { error: "Location not found." };

  const { data: defsData } = await admin
    .from("field_definitions")
    .select(
      "id, location_type_id, key, label, kind, required, position, help_text, options",
    )
    .eq("location_type_id", existing.location_type_id)
    .returns<AdminFieldDefinition[]>();

  const { attributes, errors: attributeErrors } = buildAttributesFromFormData(
    formData,
    defsData ?? [],
  );
  if (Object.keys(attributeErrors).length > 0) {
    return { attributeErrors };
  }

  const { error } = await admin
    .from("locations")
    .update({ name, attributes, notes: notes || null })
    .eq("id", locationId);

  if (error) return { error: error.message };

  redirect(`/admin/events/${event.slug}/locations/${locationId}`);
}
