"use client";

import { useActionState } from "react";

import {
  createShift,
  updateShift,
  type ShiftFormState,
} from "./actions";

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950";
const labelClass = "text-sm font-medium";
const errorClass = "text-sm text-red-600 dark:text-red-400";

type LocationOption = { id: string; name: string };
type RoleOption = { id: string; name: string };

type Defaults = {
  location_id: string;
  shift_role_id: string;
  role_label: string;
  date: string;
  starts_at: string;
  ends_at: string;
  capacity: number;
  notes: string;
};

type NewProps = {
  mode: "new";
  eventSlug: string;
  eventTimezone: string;
  locations: LocationOption[];
  roles: RoleOption[];
  defaults: Defaults;
};

type EditProps = {
  mode: "edit";
  eventSlug: string;
  shiftId: string;
  eventTimezone: string;
  locations: LocationOption[];
  roles: RoleOption[];
  defaults: Defaults;
};

type Props = NewProps | EditProps;

export default function ShiftForm(props: Props) {
  const action = props.mode === "new" ? createShift : updateShift;
  const [state, formAction, pending] = useActionState<ShiftFormState, FormData>(
    action,
    {},
  );

  const fieldError = (key: keyof NonNullable<ShiftFormState["fieldErrors"]>) =>
    state.fieldErrors?.[key];

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="eventSlug" value={props.eventSlug} />
      {props.mode === "edit" && (
        <input type="hidden" name="shiftId" value={props.shiftId} />
      )}

      <div className="space-y-1.5">
        <label htmlFor="location_id" className={labelClass}>
          Location
        </label>
        <select
          id="location_id"
          name="location_id"
          required
          defaultValue={props.defaults.location_id}
          className={inputClass}
        >
          <option value="">— Pick a location —</option>
          {props.locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>
        {fieldError("location_id") && (
          <p className={errorClass}>{fieldError("location_id")}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="shift_role_id" className={labelClass}>
          Role
        </label>
        <select
          id="shift_role_id"
          name="shift_role_id"
          defaultValue={props.defaults.shift_role_id}
          className={inputClass}
        >
          <option value="">— No role —</option>
          {props.roles.map((role) => (
            <option key={role.id} value={role.id}>
              {role.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-zinc-500">
          Optional. Roles carry shared instructions across shifts.
        </p>
        {fieldError("shift_role_id") && (
          <p className={errorClass}>{fieldError("shift_role_id")}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="role_label" className={labelClass}>
          Role label override
        </label>
        <input
          id="role_label"
          name="role_label"
          type="text"
          defaultValue={props.defaults.role_label}
          placeholder="e.g. Hydration, Setup, Course Marshal"
          className={inputClass}
        />
        <p className="text-xs text-zinc-500">
          Optional free-text label, shown on lists. Falls back to the role
          name if blank.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="date" className={labelClass}>
          Date
        </label>
        <input
          id="date"
          name="date"
          type="date"
          required
          defaultValue={props.defaults.date}
          className={inputClass}
        />
        {fieldError("starts_on") && (
          <p className={errorClass}>{fieldError("starts_on")}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="starts_at" className={labelClass}>
            Start time
          </label>
          <input
            id="starts_at"
            name="starts_at"
            type="time"
            required
            defaultValue={props.defaults.starts_at}
            className={inputClass}
          />
          {fieldError("starts_at") && (
            <p className={errorClass}>{fieldError("starts_at")}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="ends_at" className={labelClass}>
            End time
          </label>
          <input
            id="ends_at"
            name="ends_at"
            type="time"
            required
            defaultValue={props.defaults.ends_at}
            className={inputClass}
          />
          {fieldError("ends_at") && (
            <p className={errorClass}>{fieldError("ends_at")}</p>
          )}
        </div>
      </div>
      <p className="-mt-3 text-xs text-zinc-500">
        Times are in {props.eventTimezone}.
      </p>

      <div className="space-y-1.5">
        <label htmlFor="capacity" className={labelClass}>
          Capacity
        </label>
        <input
          id="capacity"
          name="capacity"
          type="number"
          min={1}
          required
          defaultValue={props.defaults.capacity}
          className={inputClass}
        />
        {fieldError("capacity") && (
          <p className={errorClass}>{fieldError("capacity")}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="notes" className={labelClass}>
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={props.defaults.notes}
          className={inputClass}
        />
      </div>

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
            ? "Create shift"
            : "Save changes"}
      </button>
    </form>
  );
}
