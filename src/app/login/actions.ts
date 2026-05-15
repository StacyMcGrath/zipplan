"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string };

export async function sendMagicLink(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const next = String(formData.get("next") ?? "/admin");

  if (!email || !email.includes("@")) {
    return { error: "Please enter a valid email address." };
  }

  const supabase = await createClient();
  const headersList = await headers();
  // Origin reflects the request the form was posted from. In production,
  // Supabase will only honor redirects to URLs allow-listed in
  // Authentication → URL Configuration → Redirect URLs.
  const origin =
    headersList.get("origin") ??
    `https://${headersList.get("host") ?? "localhost"}`;
  const callback = new URL("/auth/callback", origin);
  callback.searchParams.set("next", next);

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: callback.toString() },
  });

  if (error) return { error: error.message };

  const params = new URLSearchParams({ sent: "1" });
  if (next) params.set("next", next);
  redirect(`/login?${params.toString()}`);
}
