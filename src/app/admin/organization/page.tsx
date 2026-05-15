import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentMembership } from "@/lib/admin-auth";

import OrgEditForm from "./edit-form";

export default async function OrganizationPage() {
  const membership = await getCurrentMembership();
  if (!membership) redirect("/admin/setup");

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10">
      <Link
        href="/admin"
        className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-50"
      >
        ← {membership.organization.name}
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight">
        Organization
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        Edit your organization name. The slug stays locked.
      </p>
      <div className="mt-8">
        <OrgEditForm
          defaultName={membership.organization.name}
          slug={membership.organization.slug}
        />
      </div>
    </main>
  );
}
