"use server";

import { redirect } from "next/navigation";

import { requireUser } from "@/lib/admin-auth";
import { findAvailableSlug, slugify } from "@/lib/slug";
import { createAdminClient } from "@/lib/supabase/admin";

export type SetupState = { error?: string };

export async function createOrganization(
  _prev: SetupState,
  formData: FormData,
): Promise<SetupState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();

  if (name.length < 2) {
    return { error: "Please enter a name with at least 2 characters." };
  }

  const admin = createAdminClient();
  const slug = await findAvailableSlug(admin, "organizations", slugify(name));

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({ name, slug })
    .select("id")
    .single();

  if (orgError || !org) {
    return { error: orgError?.message ?? "Failed to create organization." };
  }

  const { error: memberError } = await admin
    .from("memberships")
    .insert({ organization_id: org.id, user_id: user.id });

  if (memberError) {
    return { error: memberError.message };
  }

  redirect("/admin");
}
