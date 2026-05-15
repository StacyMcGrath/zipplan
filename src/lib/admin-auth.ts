import "server-only";

import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createSessionClient } from "@/lib/supabase/server";

export type CurrentMembership = {
  organization_id: string;
  organization: { id: string; name: string; slug: string };
};

export async function requireUser() {
  const supabase = await createSessionClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");
  return user;
}

export async function getCurrentMembership(): Promise<CurrentMembership | null> {
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
