import "server-only";

import { notFound, redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createSessionClient } from "@/lib/supabase/server";

// Dev-only bypass: when ZIPPLAN_DEV_AUTH_BYPASS=1 (and we're not in
// production), requireUser() returns a synthetic user and
// getCurrentMembership() auto-creates / returns a "Dev Org". Lets us build
// admin pages without a real session. Gated on NODE_ENV so the toggle can
// never accidentally take effect on a production deploy.
const DEV_BYPASS_AUTH =
  process.env.NODE_ENV !== "production" &&
  process.env.ZIPPLAN_DEV_AUTH_BYPASS === "1";

const DEV_USER = {
  id: "00000000-0000-0000-0000-000000000000",
  email: "dev@local",
};

export type CurrentMembership = {
  organization_id: string;
  organization: { id: string; name: string; slug: string };
};

export async function requireUser() {
  if (DEV_BYPASS_AUTH) return DEV_USER;

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");
  return user;
}

export async function getCurrentMembership(): Promise<CurrentMembership | null> {
  if (DEV_BYPASS_AUTH) {
    const admin = createAdminClient();

    const existing = await admin
      .from("organizations")
      .select("id, name, slug")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    let org = existing.data;
    if (!org) {
      const inserted = await admin
        .from("organizations")
        .insert({ name: "Dev Org", slug: "dev-org" })
        .select("id, name, slug")
        .single();
      if (inserted.error || !inserted.data) return null;
      org = inserted.data;
    }

    return { organization_id: org.id, organization: org };
  }

  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("memberships")
    .select("organization_id, organization:organizations(id, name, slug)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  // supabase-js returns the joined relation as an object for to-one FKs
  return data as unknown as CurrentMembership;
}

export type AdminEvent = {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  starts_on: string;
  ends_on: string;
  timezone: string;
  status: "draft" | "active" | "archived";
};

// Fetch an event by slug, scoped to the current org. notFound() if missing
// or if the event belongs to a different org. Use this on every event page
// to prevent URL-hacking once real auth is on.
export async function requireEventBySlug(slug: string): Promise<{
  event: AdminEvent;
  membership: CurrentMembership;
}> {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/admin/setup");

  const admin = createAdminClient();
  const { data } = await admin
    .from("events")
    .select(
      "id, organization_id, name, slug, starts_on, ends_on, timezone, status",
    )
    .eq("organization_id", membership.organization_id)
    .eq("slug", slug)
    .maybeSingle<AdminEvent>();

  if (!data) notFound();

  return { event: data, membership };
}
