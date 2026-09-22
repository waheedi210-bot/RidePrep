import type { AirQualityPayload } from "./air-quality.ts";
import { hoursForRide } from "./weather.ts";

export async function requestBriefingAirQuality(options: {
  lat: number;
  lng: number;
  startTime: Date;
  movingHours: number;
  signal?: AbortSignal;
}): Promise<AirQualityPayload> {
  const hours = hoursForRide(options.movingHours);
  const query = new URLSearchParams({
    lat: String(options.lat),
    lng: String(options.lng),
    startTime: options.startTime.toISOString(),
    hours: String(hours),
  });
  const response = await fetch(`/api/air-quality?${query}`, {
    headers: { Accept: "application/json" },
    signal: options.signal,
  });
  const body = (await response.json()) as
    | AirQualityPayload
    | { error?: { message?: string } };

  if (!response.ok || !("hours" in body)) {
    const message =
      "error" in body && body.error?.message
        ? body.error.message
        : "Could not load air quality.";
    throw new Error(message);
  }

  return body;
}
