// Curated short list for v1. Expand later (or switch to a typeahead) when
// non-US events come into scope.
export const COMMON_TIMEZONES = [
  { value: "America/New_York", label: "Eastern (New York)" },
  { value: "America/Chicago", label: "Central (Chicago)" },
  { value: "America/Denver", label: "Mountain (Denver)" },
  { value: "America/Phoenix", label: "Arizona (Phoenix, no DST)" },
  { value: "America/Los_Angeles", label: "Pacific (Los Angeles)" },
  { value: "America/Anchorage", label: "Alaska (Anchorage)" },
  { value: "Pacific/Honolulu", label: "Hawaii (Honolulu)" },
] as const;

export const TIMEZONE_VALUES = COMMON_TIMEZONES.map((tz) => tz.value);

export type TimezoneValue = (typeof COMMON_TIMEZONES)[number]["value"];

export function isValidTimezone(value: string): value is TimezoneValue {
  return (TIMEZONE_VALUES as readonly string[]).includes(value);
}
