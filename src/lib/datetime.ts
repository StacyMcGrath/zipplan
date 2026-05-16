// Convert a wall-clock date + time in a specific IANA timezone to a UTC
// timestamp (ISO 8601). Handles DST correctly because it asks Intl what
// the offset actually is on that date — no hardcoded offsets.
//
// Example:
//   localToUtcIso(2026, 7, 23, 8, 15, "America/New_York")
//   → "2026-07-23T12:15:00.000Z"  (08:15 EDT)
export function localToUtcIso(
  year: number,
  month: number, // 1-12
  day: number,
  hour: number, // 0-23
  minute: number,
  timezone: string,
): string {
  // Build a Date treating the components as if they were UTC. This is wrong
  // by exactly the timezone offset; we measure that offset and correct.
  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute);

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(new Date(naiveUtc))
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, p.value]),
  );

  const tzAsUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    // Some locales emit "24" for midnight; normalize.
    Number(parts.hour) === 24 ? 0 : Number(parts.hour),
    Number(parts.minute),
    Number(parts.second ?? "0"),
  );

  const offsetMs = naiveUtc - tzAsUtc;
  return new Date(naiveUtc + offsetMs).toISOString();
}

// Parse a "h:mm AM/PM" string into [hour24, minute]. Throws on invalid input.
export function parseAmPmTime(value: string): [number, number] {
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) {
    throw new Error(`Could not parse time: "${value}"`);
  }
  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const isPm = match[3].toUpperCase() === "PM";
  if (hour === 12) hour = isPm ? 12 : 0;
  else if (isPm) hour += 12;
  return [hour, minute];
}

// Parse "MM/DD/YY" or "MM/DD/YYYY" into [year, month1to12, day]. Two-digit
// years are interpreted as 2000+yy. Throws on invalid input.
export function parseShortDate(value: string): [number, number, number] {
  const match = value.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!match) {
    throw new Error(`Could not parse date: "${value}"`);
  }
  const month = Number(match[1]);
  const day = Number(match[2]);
  let year = Number(match[3]);
  if (year < 100) year = 2000 + year;
  return [year, month, day];
}

// Format a UTC ISO timestamp into "h:mm AM" in a given IANA timezone.
export function formatTimeInZone(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

// Format a UTC ISO timestamp into a YYYY-MM-DD date key in a given IANA
// timezone. Useful for grouping shifts by day.
export function dateKeyInZone(iso: string, timezone: string): string {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date(iso))
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

// Format a UTC ISO timestamp into a long human-readable date in a given
// IANA timezone, e.g. "Thursday, July 23, 2026".
export function formatLongDateInZone(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(iso));
}
