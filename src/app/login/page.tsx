import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import LoginForm from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; sent?: string; error?: string }>;
}) {
  const { next, sent, error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(next || "/admin");

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Sign in to Zipplan
          </h1>
          <p className="text-sm text-zinc-500">
            We&rsquo;ll email you a link to sign in.
          </p>
        </div>
        <LoginForm next={next} sent={!!sent} initialError={error} />
      </div>
    </main>
  );
}
