import { hoursForRide, type WeatherPayload } from "./weather.ts";
import { sampleHourlyPoints, spreadKm, type GeoPoint } from "./geo.ts";

export async function requestBriefingWeather(options: {
  lat: number;
  lng: number;
  startTime: Date;
  movingHours: number;
  points?: GeoPoint[];
  signal?: AbortSignal;
}): Promise<WeatherPayload> {
  const hours = hoursForRide(options.movingHours);
  const useTrack =
    options.points &&
    options.points.length >= 2 &&
    spreadKm(options.points) > 25;

  if (useTrack && options.points) {
    const samples = sampleHourlyPoints(options.points, hours, options.movingHours);
    const response = await fetch("/api/weather", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      signal: options.signal,
      body: JSON.stringify({
        startTime: options.startTime.toISOString(),
        hours,
        samples: samples.map((point) => ({ lat: point.lat, lng: point.lng })),
      }),
    });

    return readWeatherResponse(response);
  }

  const query = new URLSearchParams({
    lat: String(options.lat),
    lng: String(options.lng),
    startTime: options.startTime.toISOString(),
    hours: String(hours),
  });
  const response = await fetch(`/api/weather?${query}`, {
    headers: { Accept: "application/json" },
    signal: options.signal,
  });

  return readWeatherResponse(response);
}

async function readWeatherResponse(response: Response): Promise<WeatherPayload> {
  const body = (await response.json()) as
    | WeatherPayload
    | { error?: { message?: string } };

  if (!response.ok || !("hours" in body)) {
    const message =
      "error" in body && body.error?.message
        ? body.error.message
        : "Could not load the forecast.";
    throw new Error(message);
  }

  return body;
}
