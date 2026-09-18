const COMPASS_POINTS = [
  "N",
  "NNE",
  "NE",
  "ENE",
  "E",
  "ESE",
  "SE",
  "SSE",
  "S",
  "SSW",
  "SW",
  "WSW",
  "W",
  "WNW",
  "NW",
  "NNW",
];

export const kmToMiles = (km: number) => km * 0.621371;
export const metresToFeet = (metres: number) => metres * 3.28084;
export const psiToBar = (psi: number) => psi / 14.5038;
export const kphToMph = (kph: number) => kph * 0.621371;
export const kgToLb = (kg: number) => kg * 2.20462;
export const lbToKg = (lb: number) => lb / 2.20462;
export const mlToFlOz = (ml: number) => ml * 0.033814;
export const kjToKcal = (kj: number) => kj * 0.239006;

export function celsiusToFahrenheit(celsius: number): number {
  return celsius * (9 / 5) + 32;
}

export function fahrenheitToCelsius(fahrenheit: number): number {
  return (fahrenheit - 32) * (5 / 9);
}

/** Convert a Celsius *delta* (wind-chill drop, not an absolute temperature). */
export function celsiusDeltaToFahrenheit(deltaC: number): number {
  return deltaC * (9 / 5);
}

export function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/**
 * Formatted without `toLocaleString` so the server and the browser cannot
 * disagree about separators and trip a hydration mismatch.
 */
export function formatNumber(value: number, fractionDigits = 0): string {
  const [whole, fraction] = value.toFixed(fractionDigits).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return fraction ? `${grouped}.${fraction}` : grouped;
}

export function formatTempF(tempC: number, fractionDigits = 0): string {
  return `${formatNumber(celsiusToFahrenheit(tempC), fractionDigits)}°F`;
}

export function formatMph(kph: number, fractionDigits = 0): string {
  return `${formatNumber(kphToMph(kph), fractionDigits)} mph`;
}

export function formatDuration(hours: number): string {
  const totalMinutes = Math.round(hours * 60);
  const wholeHours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return minutes === 0
    ? `${wholeHours}h`
    : `${wholeHours}h ${String(minutes).padStart(2, "0")}m`;
}

export function normaliseBearing(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

export function bearingToCompass(degrees: number): string {
  const index = Math.round(normaliseBearing(degrees) / 22.5) % 16;

  return COMPASS_POINTS[index];
}

/** Smallest angle between two bearings, 0–180. */
export function bearingDifference(a: number, b: number): number {
  return Math.abs(((a - b + 540) % 360) - 180);
}

/** Bearings have to be averaged as vectors, or 350° and 10° average to 180°. */
export function averageBearing(bearings: number[]): number {
  const { sin, cos } = bearings.reduce(
    (totals, bearing) => {
      const radians = (bearing * Math.PI) / 180;

      return {
        sin: totals.sin + Math.sin(radians),
        cos: totals.cos + Math.cos(radians),
      };
    },
    { sin: 0, cos: 0 },
  );

  return normaliseBearing((Math.atan2(sin, cos) * 180) / Math.PI);
}
