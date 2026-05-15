import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// Probe the table for an unused slug, appending -2, -3, ... until one is free.
// `scope` lets us narrow the uniqueness check to a parent (e.g. organization_id
// for events). Pass scope=undefined for tables with a globally-unique slug.
export async function findAvailableSlug(
  supabase: SupabaseClient,
  table: string,
  baseSlug: string,
  scope?: { column: string; value: string },
): Promise<string> {
  const safeBase = baseSlug || "item";
  let candidate = safeBase;

  for (let i = 2; i < 1000; i++) {
    let query = supabase.from(table).select("id").eq("slug", candidate);
    if (scope) query = query.eq(scope.column, scope.value);
    const { data } = await query.maybeSingle();
    if (!data) return candidate;
    candidate = `${safeBase}-${i}`;
  }

  // Extremely unlikely; fall back to a timestamp suffix
  return `${safeBase}-${Date.now()}`;
}
