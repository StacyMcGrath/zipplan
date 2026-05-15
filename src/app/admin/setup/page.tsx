import { redirect } from "next/navigation";

import { getCurrentMembership } from "@/lib/admin-auth";

import SetupForm from "./setup-form";

export default async function AdminSetupPage() {
  const membership = await getCurrentMembership();
  if (membership) redirect("/admin");

  return (
    <main className="mx-auto w-full max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">
        Create your organization
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        Organizations group your events, volunteers, and resources. You can
        invite teammates later.
      </p>
      <div className="mt-6">
        <SetupForm />
      </div>
    </main>
  );
}
