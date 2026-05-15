"use client";

import { useActionState } from "react";

import { updateOrganization, type OrgEditState } from "./actions";

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950";
const errorClass = "text-sm text-red-600 dark:text-red-400";

export default function OrgEditForm({
  defaultName,
  slug,
}: {
  defaultName: string;
  slug: string;
}) {
  const [state, formAction, pending] = useActionState<OrgEditState, FormData>(
    updateOrganization,
    {},
  );

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          Organization name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          autoFocus
          minLength={2}
          maxLength={100}
          defaultValue={defaultName}
          className={inputClass}
        />
        {state.fieldErrors?.name && (
          <p className={errorClass}>{state.fieldErrors.name}</p>
        )}
        <p className="text-xs text-zinc-500">
          Slug is locked: <code>{slug}</code>
        </p>
      </div>

      {state.error && <p className={errorClass}>{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
