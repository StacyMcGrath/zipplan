"use client";

import { useActionState } from "react";

import {
  createEvent,
  updateEvent,
  type EventFormState,
} from "./actions";
import { COMMON_TIMEZONES } from "./timezones";

type EditDefaults = {
  slug: string;
  name: string;
  starts_on: string;
  ends_on: string;
  timezone: string;
  status: "draft" | "active" | "archived";
};

type Props =
  | { mode: "new"; defaults?: undefined }
  | { mode: "edit"; defaults: EditDefaults };

const STATUS_OPTIONS: Array<{
  value: EditDefaults["status"];
  label: string;
}> = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
];

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none disabled:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:disabled:bg-zinc-900";
const labelClass = "text-sm font-medium";
const errorClass = "text-sm text-red-600 dark:text-red-400";

export default function EventForm(props: Props) {
  const action = props.mode === "new" ? createEvent : updateEvent;
  const [state, formAction, pending] = useActionState<EventFormState, FormData>(
    action,
    {},
  );

  const fieldError = (
    key: "name" | "starts_on" | "ends_on" | "timezone" | "status",
  ) => state.fieldErrors?.[key];

  return (
    <form action={formAction} className="space-y-5">
      {props.mode === "edit" && (
        <input type="hidden" name="slug" value={props.defaults.slug} />
      )}

      <div className="space-y-1.5">
        <label htmlFor="name" className={labelClass}>
          Event name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          autoFocus={props.mode === "new"}
          minLength={2}
          maxLength={100}
          defaultValue={props.defaults?.name}
          className={inputClass}
        />
        {fieldError("name") && <p className={errorClass}>{fieldError("name")}</p>}
        {props.mode === "edit" && (
          <p className="text-xs text-zinc-500">
            URL slug is locked after creation:{" "}
            <code>/admin/events/{props.defaults.slug}</code>
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="starts_on" className={labelClass}>
            Start date
          </label>
          <input
            id="starts_on"
            name="starts_on"
            type="date"
            required
            defaultValue={props.defaults?.starts_on}
            className={inputClass}
          />
          {fieldError("starts_on") && (
            <p className={errorClass}>{fieldError("starts_on")}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="ends_on" className={labelClass}>
            End date
          </label>
          <input
            id="ends_on"
            name="ends_on"
            type="date"
            required
            defaultValue={props.defaults?.ends_on}
            className={inputClass}
          />
          {fieldError("ends_on") && (
            <p className={errorClass}>{fieldError("ends_on")}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="timezone" className={labelClass}>
          Timezone
        </label>
        <select
          id="timezone"
          name="timezone"
          defaultValue={props.defaults?.timezone ?? "America/New_York"}
          className={inputClass}
        >
          {COMMON_TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
        {fieldError("timezone") && (
          <p className={errorClass}>{fieldError("timezone")}</p>
        )}
      </div>

      {props.mode === "edit" && (
        <div className="space-y-1.5">
          <label htmlFor="status" className={labelClass}>
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={props.defaults.status}
            className={inputClass}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {fieldError("status") && (
            <p className={errorClass}>{fieldError("status")}</p>
          )}
        </div>
      )}

      {state.error && <p className={errorClass}>{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending
          ? props.mode === "new"
            ? "Creating…"
            : "Saving…"
          : props.mode === "new"
            ? "Create event"
            : "Save changes"}
      </button>
    </form>
  );
}
