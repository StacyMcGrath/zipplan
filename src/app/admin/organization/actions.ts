"use server";

import { redirect } from "next/navigation";

import { getCurrentMembership, requireUser } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type OrgEditState = {
  error?: string;
  fieldErrors?: { name?: string };
};

export async function updateOrganization(
  _prev: OrgEditState,
  formData: FormData,
): Promise<OrgEditState> {
  await requireUser();
  const membership = await getCurrentMembership();
  if (!membership) return { error: "No organization in scope." };

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2 || name.length > 100) {
    return { fieldErrors: { name: "Name must be 2–100 characters." } };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("organizations")
    .update({ name })
    .eq("id", membership.organization_id);

  if (error) return { error: error.message };

  redirect("/admin");
}
