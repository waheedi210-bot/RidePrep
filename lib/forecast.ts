import type { HourlyConditions } from "./briefing.ts";
import { formatHourLabel } from "./datetime.ts";
import { roundCoord, type GeoPoint } from "./geo.ts";
import { fetchOpenMeteoForecast } from "./open-meteo.ts";
import {
  observeCurrent,
  sliceHourlyFromStart,
  type WeatherObservation,
  type WeatherPayload,
} from "./weather.ts";

export function observationsToHourly(
  hours: WeatherObservation[],
  timeZone: string,
): HourlyConditions[] {
  return hours.map((hour) => ({
    time: formatHourLabel(new Date(hour.time), timeZone),
    tempC: hour.temperatureC,
    feelsLikeC: hour.apparentWindChillC,
    windKph: hour.windSpeedKph,
    gustKph: hour.windGustKph,
    windFromDeg: hour.windDirectionDeg,
    precipChance: hour.precipChance,
    humidityPct: hour.humidityPct,
    dewPointC: hour.dewPointC,
    uvIndex: hour.uvIndex,
  }));
}

export function uniqueWeatherCells(points: GeoPoint[]): GeoPoint[] {
  const seen = new Set<string>();
  const cells: GeoPoint[] = [];

  for (const point of points) {
    const lat = roundCoord(point.lat);
    const lng = roundCoord(point.lng);
    const key = `${lat},${lng}`;

    if (!seen.has(key)) {
      seen.add(key);
      cells.push({ lat, lng });
    }

    if (cells.length >= 4) {
      break;
    }
  }

  return cells.length > 0 ? cells : points.slice(0, 1);
}

export async function loadForecast(options: {
  lat: number;
  lng: number;
  startTime: Date;
  hours: number;
}): Promise<WeatherPayload> {
  const forecast = await fetchOpenMeteoForecast(options.lat, options.lng);
  const current = observeCurrent(forecast.current, forecast.timezone);

  if (!current) {
    throw new Error("Open-Meteo omitted the current observation.");
  }

  const sliced = sliceHourlyFromStart(
    forecast.hourly,
    options.startTime,
    options.hours,
    forecast.timezone,
  );

  if ("error" in sliced) {
    throw new Error(sliced.error);
  }

  return {
    location: {
      lat: forecast.latitude,
      lng: forecast.longitude,
      elevationM: forecast.elevation,
      timezone: forecast.timezone,
    },
    query: {
      lat: options.lat,
      lng: options.lng,
      startTime: options.startTime.toISOString(),
    },
    current,
    hours: sliced.hours,
  };
}

/**
 * One Open-Meteo call per rounded cell, then pick the hour that matches
 * each sample so a long route gets micro-climate shifts instead of a
 * single start-point forecast.
 */
export async function loadForecastAlongRoute(options: {
  samples: GeoPoint[];
  startTime: Date;
  hours: number;
}): Promise<WeatherPayload> {
  const samples = options.samples.slice(0, options.hours);
  const cells = uniqueWeatherCells(samples.length > 0 ? samples : [{ lat: 0, lng: 0 }]);

  if (samples.length === 0) {
    throw new Error("A route needs at least one sample point.");
  }

  if (cells.length === 1) {
    return loadForecast({
      lat: samples[0].lat,
      lng: samples[0].lng,
      startTime: options.startTime,
      hours: options.hours,
    });
  }

  const forecasts = await Promise.all(
    cells.map((cell) => loadForecast({
      lat: cell.lat,
      lng: cell.lng,
      startTime: options.startTime,
      hours: options.hours,
    })),
  );

  const hours: WeatherObservation[] = samples.map((sample, index) => {
    const lat = roundCoord(sample.lat);
    const lng = roundCoord(sample.lng);
    const match =
      forecasts.find(
        (forecast) =>
          roundCoord(forecast.query.lat) === lat &&
          roundCoord(forecast.query.lng) === lng,
      ) ?? forecasts[0];
    const slot = match.hours[Math.min(index, match.hours.length - 1)];

    return slot;
  });

  return {
    ...forecasts[0],
    query: {
      lat: samples[0].lat,
      lng: samples[0].lng,
      startTime: options.startTime.toISOString(),
    },
    hours,
  };
}
