"use server";

import { redirect } from "next/navigation";

import { requireUser } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type SetupState = { error?: string };

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

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
  const baseSlug = slugify(name) || "org";

  let slug = baseSlug;
  for (let i = 2; i < 100; i++) {
    const { data } = await admin
      .from("organizations")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data) break;
    slug = `${baseSlug}-${i}`;
  }

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
