import type { AdminFieldDefinition } from "@/lib/admin-auth";

const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950";

type SelectOption = { value: string; label: string };

// Form field name prefix that distinguishes dynamic attribute fields from
// reserved form fields like `name` or `notes`. Server actions strip this
// prefix when building the attributes JSONB.
export const FIELD_NAME_PREFIX = "field_";

export function fieldFormName(key: string): string {
  return `${FIELD_NAME_PREFIX}${key}`;
}

export function attributeKeyFromFormName(name: string): string | null {
  return name.startsWith(FIELD_NAME_PREFIX)
    ? name.slice(FIELD_NAME_PREFIX.length)
    : null;
}

// Render a label + the right input for a field_definition. Pure server-side
// component; works inside any form. The form posts a flat FormData; the
// server action reconstructs attributes by stripping FIELD_NAME_PREFIX.
export function DynamicFieldInput({
  def,
  defaultValue,
}: {
  def: AdminFieldDefinition;
  defaultValue: unknown;
}) {
  const name = fieldFormName(def.key);
  const idAttr = `field-${def.key}`;
  const value = typeof defaultValue === "string" ? defaultValue : "";

  return (
    <div className="space-y-1.5">
      <label htmlFor={idAttr} className="text-sm font-medium">
        {def.label}
        {def.required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <FieldControl
        id={idAttr}
        name={name}
        kind={def.kind}
        required={def.required}
        defaultValue={value}
        options={def.options as SelectOption[] | null}
      />
      {def.help_text && (
        <p className="text-xs text-zinc-500">{def.help_text}</p>
      )}
    </div>
  );
}

function FieldControl({
  id,
  name,
  kind,
  required,
  defaultValue,
  options,
}: {
  id: string;
  name: string;
  kind: AdminFieldDefinition["kind"];
  required: boolean;
  defaultValue: string;
  options: SelectOption[] | null;
}) {
  switch (kind) {
    case "multiline":
      return (
        <textarea
          id={id}
          name={name}
          required={required}
          defaultValue={defaultValue}
          rows={3}
          className={inputClass}
        />
      );
    case "number":
      return (
        <input
          id={id}
          name={name}
          type="number"
          required={required}
          defaultValue={defaultValue}
          className={inputClass}
        />
      );
    case "phone":
      return (
        <input
          id={id}
          name={name}
          type="tel"
          required={required}
          defaultValue={defaultValue}
          className={inputClass}
        />
      );
    case "email":
      return (
        <input
          id={id}
          name={name}
          type="email"
          required={required}
          defaultValue={defaultValue}
          className={inputClass}
        />
      );
    case "url":
      return (
        <input
          id={id}
          name={name}
          type="url"
          required={required}
          defaultValue={defaultValue}
          className={inputClass}
        />
      );
    case "date":
      return (
        <input
          id={id}
          name={name}
          type="date"
          required={required}
          defaultValue={defaultValue}
          className={inputClass}
        />
      );
    case "datetime":
      return (
        <input
          id={id}
          name={name}
          type="datetime-local"
          required={required}
          defaultValue={defaultValue}
          className={inputClass}
        />
      );
    case "what3words":
      return (
        <input
          id={id}
          name={name}
          type="text"
          required={required}
          defaultValue={defaultValue}
          placeholder="word.word.word"
          className={inputClass}
        />
      );
    case "select":
      return (
        <select
          id={id}
          name={name}
          required={required}
          defaultValue={defaultValue}
          className={inputClass}
        >
          <option value="">—</option>
          {(options ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    case "multiselect":
      // Not supported in v1 forms — defer.
      return (
        <p className="text-xs text-zinc-500">
          Multiselect editing not yet supported. Edit via SQL for now.
        </p>
      );
    case "text":
    default:
      return (
        <input
          id={id}
          name={name}
          type="text"
          required={required}
          defaultValue={defaultValue}
          className={inputClass}
        />
      );
  }
}
