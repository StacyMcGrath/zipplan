"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";

import type { AdminFieldDefinition } from "@/lib/admin-auth";
import { DynamicFieldInput } from "@/lib/dynamic-field-input";

import {
  createLocation,
  updateLocation,
  type LocationFormState,
} from "./actions";

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950";
const errorClass = "text-sm text-red-600 dark:text-red-400";

type LocationType = {
  id: string;
  name: string;
};

type NewProps = {
  mode: "new";
  eventSlug: string;
  locationTypes: LocationType[];
  selectedTypeId: string;
  fieldDefinitions: AdminFieldDefinition[];
};

type EditProps = {
  mode: "edit";
  eventSlug: string;
  locationId: string;
  locationTypeName: string;
  defaults: {
    name: string;
    notes: string;
    attributes: Record<string, unknown>;
  };
  fieldDefinitions: AdminFieldDefinition[];
};

type Props = NewProps | EditProps;

export default function LocationForm(props: Props) {
  const router = useRouter();
  const action = props.mode === "new" ? createLocation : updateLocation;
  const [state, formAction, pending] = useActionState<
    LocationFormState,
    FormData
  >(action, {});

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="eventSlug" value={props.eventSlug} />
      {props.mode === "edit" && (
        <input type="hidden" name="locationId" value={props.locationId} />
      )}

      {props.mode === "new" ? (
        <div className="space-y-1.5">
          <label htmlFor="locationTypeId" className="text-sm font-medium">
            Location type
          </label>
          <select
            id="locationTypeId"
            name="locationTypeId"
            value={props.selectedTypeId}
            onChange={(e) => {
              const params = new URLSearchParams();
              params.set("type", e.target.value);
              router.push(
                `/admin/events/${props.eventSlug}/locations/new?${params.toString()}`,
              );
            }}
            className={inputClass}
          >
            {props.locationTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          {state.fieldErrors?.type && (
            <p className={errorClass}>{state.fieldErrors.type}</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-zinc-500">
          Type is locked after creation:{" "}
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            {props.locationTypeName}
          </span>
        </p>
      )}

      <div className="space-y-1.5">
        <label htmlFor="name" className="text-sm font-medium">
          Name
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          autoFocus={props.mode === "new"}
          minLength={2}
          maxLength={200}
          defaultValue={props.mode === "edit" ? props.defaults.name : undefined}
          className={inputClass}
        />
        {state.fieldErrors?.name && (
          <p className={errorClass}>{state.fieldErrors.name}</p>
        )}
      </div>

      {props.fieldDefinitions.map((def) => (
        <div key={def.id}>
          <DynamicFieldInput
            def={def}
            defaultValue={
              props.mode === "edit"
                ? props.defaults.attributes[def.key]
                : undefined
            }
          />
          {state.attributeErrors?.[def.key] && (
            <p className={`mt-1 ${errorClass}`}>
              {state.attributeErrors[def.key]}
            </p>
          )}
        </div>
      ))}

      <div className="space-y-1.5">
        <label htmlFor="notes" className="text-sm font-medium">
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={props.mode === "edit" ? props.defaults.notes : ""}
          className={inputClass}
        />
        <p className="text-xs text-zinc-500">
          Free-form notes — not part of the structured fields above.
        </p>
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
            ? "Create location"
            : "Save changes"}
      </button>
    </form>
  );
}
