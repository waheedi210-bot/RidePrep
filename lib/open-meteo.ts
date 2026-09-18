import { usableIanaTimeZone } from "./datetime.ts";
import { isOpenMeteoForecast, type OpenMeteoForecast } from "./weather.ts";

export const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";

const CURRENT_VARIABLES = [
  "temperature_2m",
  "relative_humidity_2m",
  "apparent_temperature",
  "dew_point_2m",
  "wind_speed_10m",
  "wind_gusts_10m",
  "wind_direction_10m",
  "uv_index",
] as const;

const HOURLY_VARIABLES = [
  ...CURRENT_VARIABLES,
  "precipitation_probability",
] as const;

const FETCH_TIMEOUT_MS = 8_000;
const REVALIDATE_SECONDS = 600;

export class OpenMeteoError extends Error {
  readonly status: number;
  readonly code: "UPSTREAM_TIMEOUT" | "UPSTREAM_ERROR";

  constructor(
    message: string,
    status: number,
    code: "UPSTREAM_TIMEOUT" | "UPSTREAM_ERROR",
  ) {
    super(message);
    this.name = "OpenMeteoError";
    this.status = status;
    this.code = code;
  }
}

export async function fetchOpenMeteoForecast(
  lat: number,
  lng: number,
): Promise<OpenMeteoForecast> {
  const url = new URL(OPEN_METEO_URL);

  url.searchParams.set("latitude", lat.toFixed(4));
  url.searchParams.set("longitude", lng.toFixed(4));
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("timeformat", "iso8601");
  url.searchParams.set("temperature_unit", "celsius");
  url.searchParams.set("wind_speed_unit", "kmh");
  url.searchParams.set("forecast_days", "7");
  url.searchParams.set("current", CURRENT_VARIABLES.join(","));
  url.searchParams.set("hourly", HOURLY_VARIABLES.join(","));

  let response: Response;

  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: REVALIDATE_SECONDS },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new OpenMeteoError(
        "Timed out waiting for Open-Meteo.",
        504,
        "UPSTREAM_TIMEOUT",
      );
    }

    throw new OpenMeteoError(
      "Could not reach Open-Meteo.",
      502,
      "UPSTREAM_ERROR",
    );
  }

  let body: unknown;

  try {
    body = await response.json();
  } catch {
    throw new OpenMeteoError(
      "Open-Meteo returned a non-JSON response.",
      502,
      "UPSTREAM_ERROR",
    );
  }

  if (!response.ok) {
    const reason =
      typeof body === "object" &&
      body !== null &&
      "reason" in body &&
      typeof body.reason === "string"
        ? body.reason
        : `Open-Meteo responded with ${response.status}.`;

    throw new OpenMeteoError(reason, 502, "UPSTREAM_ERROR");
  }

  if (!isOpenMeteoForecast(body)) {
    throw new OpenMeteoError(
      "Open-Meteo returned an unexpected forecast shape.",
      502,
      "UPSTREAM_ERROR",
    );
  }

  return body;
}

export async function fetchIanaTimezone(
  lat: number,
  lng: number,
): Promise<string | null> {
  const url = new URL(OPEN_METEO_URL);

  url.searchParams.set("latitude", lat.toFixed(4));
  url.searchParams.set("longitude", lng.toFixed(4));
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", "1");
  url.searchParams.set("current", "temperature_2m");

  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: REVALIDATE_SECONDS },
    });
    const body = (await response.json()) as { timezone?: string };

    if (!response.ok) {
      return null;
    }

    return usableIanaTimeZone(body.timezone);
  } catch {
    return null;
  }
}
