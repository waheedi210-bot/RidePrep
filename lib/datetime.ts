/**
 * Timezone helpers without a date library. Wall-clock fields in a named zone
 * (e.g. tomorrow 06:30 Europe/London) convert to a UTC instant for Open-Meteo.
 */

function partsInZone(
  instant: Date,
  timeZone: string,
): { year: number; month: number; day: number; hour: number; minute: number } {
  const map = new Map<string, string>();

  for (const part of new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant)) {
    if (part.type !== "literal") {
      map.set(part.type, part.value);
    }
  }

  return {
    year: Number(map.get("year")),
    month: Number(map.get("month")),
    day: Number(map.get("day")),
    hour: Number(map.get("hour")),
    minute: Number(map.get("minute")),
  };
}

function asUtcMs(fields: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}): number {
  return Date.UTC(fields.year, fields.month - 1, fields.day, fields.hour, fields.minute);
}

/** UTC instant for a wall-clock date and time in `timeZone`. */
export function fromZonedFields(
  dateYmd: string,
  timeHm: string,
  timeZone: string,
): Date {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateYmd.trim());
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeHm.trim());

  if (!dateMatch || !timeMatch) {
    return new Date(Number.NaN);
  }

  const wall = {
    year: Number(dateMatch[1]),
    month: Number(dateMatch[2]),
    day: Number(dateMatch[3]),
    hour: Number(timeMatch[1]),
    minute: Number(timeMatch[2]),
  };
  const guess = asUtcMs(wall);
  const offset = asUtcMs(partsInZone(new Date(guess), timeZone)) - guess;

  return new Date(guess - offset);
}

export function toZonedDateInput(instant: Date, timeZone: string): string {
  const fields = partsInZone(instant, timeZone);
  const month = String(fields.month).padStart(2, "0");
  const day = String(fields.day).padStart(2, "0");

  return `${fields.year}-${month}-${day}`;
}

export function toZonedTimeInput(instant: Date, timeZone: string): string {
  const fields = partsInZone(instant, timeZone);

  return `${String(fields.hour).padStart(2, "0")}:${String(fields.minute).padStart(2, "0")}`;
}

/** Tomorrow at `timeHm` (HH:mm) in `timeZone`. */
export function tomorrowAt(timeHm: string, timeZone: string, now = new Date()): Date {
  const today = toZonedDateInput(now, timeZone);
  const todayAt = fromZonedFields(today, timeHm, timeZone);
  const next = new Date(todayAt.getTime() + 24 * 60 * 60 * 1000);

  return fromZonedFields(toZonedDateInput(next, timeZone), timeHm, timeZone);
}

export function formatHourLabel(instant: Date, timeZone: string): string {
  return toZonedTimeInput(instant, timeZone);
}

const IGNORED_ZONES = new Set(["UTC", "GMT", "Etc/UTC", "Etc/GMT"]);

/** IANA names we can feed to `Intl`, excluding the UTC aliases Open-Meteo uses. */
export function usableIanaTimeZone(value: string | null | undefined): string | null {
  if (!value || IGNORED_ZONES.has(value)) {
    return null;
  }

  try {
    Intl.DateTimeFormat("en-GB", { timeZone: value });
    return value;
  } catch {
    return null;
  }
}
