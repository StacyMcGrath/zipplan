import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentMembership } from "@/lib/admin-auth";

import EventForm from "../event-form";

export default async function NewEventPage() {
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
        New event
      </h1>
      <p className="mt-2 text-sm text-zinc-500">
        The slug is auto-generated from the name and locked after creation.
      </p>
      <div className="mt-8">
        <EventForm mode="new" />
      </div>
    </main>
  );
}
