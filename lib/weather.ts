import {
  apparentWindChillC,
  isWindChillApplicable,
  windChillC,
} from "./wind-chill.ts";

export const FORECAST_HOURS = 4;

export interface QueryIssue {
  param: string;
  message: string;
}

export interface WeatherQuery {
  lat: number;
  lng: number;
  /** UTC instant the 4-hour window starts from. `null` means "now". */
  startTime: Date | null;
}

export interface WeatherObservation {
  time: string;
  temperatureC: number;
  humidityPct: number;
  /** Open-Meteo Steadman apparent temperature. */
  apparentTemperatureC: number;
  /**
   * NWS wind-chill index when it is valid (≤ 10 °C and ≥ 4.8 km/h);
   * otherwise equal to air temperature.
   */
  windChillC: number;
  /**
   * Colder of wind-chill and apparent temperature — how cold exposed skin
   * actually feels.
   */
  apparentWindChillC: number;
  /** Degrees the conditions take off air temperature. Always ≥ 0. */
  windChillDeltaC: number;
  windChillApplicable: boolean;
  windSpeedKph: number;
  windDirectionDeg: number;
  uvIndex: number;
}

export interface WeatherPayload {
  location: {
    lat: number;
    lng: number;
    elevationM: number;
    timezone: string;
  };
  query: {
    lat: number;
    lng: number;
    startTime: string;
  };
  current: WeatherObservation;
  /** Four consecutive hourly slots beginning at the hour that contains startTime. */
  hours: WeatherObservation[];
}

export interface OpenMeteoCurrent {
  time: string;
  temperature_2m: number | null;
  relative_humidity_2m: number | null;
  apparent_temperature: number | null;
  wind_speed_10m: number | null;
  wind_direction_10m: number | null;
  uv_index: number | null;
}

export interface OpenMeteoHourly {
  time: string[];
  temperature_2m: Array<number | null>;
  relative_humidity_2m: Array<number | null>;
  apparent_temperature: Array<number | null>;
  wind_speed_10m: Array<number | null>;
  wind_direction_10m: Array<number | null>;
  uv_index: Array<number | null>;
}

export interface OpenMeteoForecast {
  latitude: number;
  longitude: number;
  elevation: number;
  timezone: string;
  utc_offset_seconds: number;
  current: OpenMeteoCurrent;
  hourly: OpenMeteoHourly;
}

export function parseWeatherQuery(searchParams: URLSearchParams):
  | { query: WeatherQuery }
  | { issues: QueryIssue[] } {
  const issues: QueryIssue[] = [];

  const lat = parseCoordinate(searchParams.get("lat"), "lat", -90, 90, issues);
  const lng = parseCoordinate(searchParams.get("lng"), "lng", -180, 180, issues);
  const startTime = parseStartTime(searchParams.get("startTime"), issues);

  if (issues.length > 0 || lat === null || lng === null) {
    return { issues };
  }

  return { query: { lat, lng, startTime } };
}

function parseCoordinate(
  raw: string | null,
  param: string,
  min: number,
  max: number,
  issues: QueryIssue[],
): number | null {
  if (raw === null || raw.trim() === "") {
    issues.push({ param, message: `${param} is required.` });
    return null;
  }

  const value = Number(raw);

  if (!Number.isFinite(value)) {
    issues.push({ param, message: `${param} must be a finite number.` });
    return null;
  }

  if (value < min || value > max) {
    issues.push({
      param,
      message: `${param} must be between ${min} and ${max}.`,
    });
    return null;
  }

  return value;
}

/**
 * Accepts a full ISO 8601 instant. Timezone-naive strings are treated as UTC
 * so the same query is stable regardless of the server's local zone.
 */
export function parseStartTime(
  raw: string | null,
  issues: QueryIssue[] = [],
): Date | null {
  if (raw === null || raw.trim() === "") {
    return null;
  }

  const trimmed = raw.trim();
  const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(trimmed);
  const instant = new Date(hasZone ? trimmed : `${trimmed}Z`);

  if (Number.isNaN(instant.getTime())) {
    issues.push({
      param: "startTime",
      message:
        "startTime must be an ISO 8601 datetime, for example 2026-09-17T06:30:00Z.",
    });
    return null;
  }

  return instant;
}

export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;

  return Math.round(value * factor) / factor;
}

/** Open-Meteo omits the `Z` when `timezone=UTC`; treat those as UTC. */
export function parseOpenMeteoTime(value: string): Date {
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(value)) {
    return new Date(value);
  }

  return new Date(`${value}Z`);
}

export function toIsoUtc(value: string): string {
  return parseOpenMeteoTime(value).toISOString();
}

export function observe(input: {
  time: string;
  temperatureC: number;
  humidityPct: number;
  apparentTemperatureC: number;
  windSpeedKph: number;
  windDirectionDeg: number;
  uvIndex: number;
}): WeatherObservation {
  const chill = windChillC(input.temperatureC, input.windSpeedKph);
  const apparent = apparentWindChillC(
    input.temperatureC,
    input.windSpeedKph,
    input.apparentTemperatureC,
  );

  return {
    time: toIsoUtc(input.time),
    temperatureC: roundTo(input.temperatureC, 1),
    humidityPct: Math.round(input.humidityPct),
    apparentTemperatureC: roundTo(input.apparentTemperatureC, 1),
    windChillC: roundTo(chill, 1),
    apparentWindChillC: roundTo(apparent, 1),
    windChillDeltaC: roundTo(Math.max(0, input.temperatureC - apparent), 1),
    windChillApplicable: isWindChillApplicable(
      input.temperatureC,
      input.windSpeedKph,
    ),
    windSpeedKph: roundTo(input.windSpeedKph, 1),
    windDirectionDeg: Math.round(input.windDirectionDeg),
    uvIndex: roundTo(input.uvIndex, 1),
  };
}

export function observeCurrent(
  current: OpenMeteoCurrent,
): WeatherObservation | null {
  return observeNullable({
    time: current.time,
    temperatureC: current.temperature_2m,
    humidityPct: current.relative_humidity_2m,
    apparentTemperatureC: current.apparent_temperature,
    windSpeedKph: current.wind_speed_10m,
    windDirectionDeg: current.wind_direction_10m,
    uvIndex: current.uv_index,
  });
}

export function observeHourly(
  hourly: OpenMeteoHourly,
  index: number,
): WeatherObservation | null {
  return observeNullable({
    time: hourly.time[index],
    temperatureC: hourly.temperature_2m[index],
    humidityPct: hourly.relative_humidity_2m[index],
    apparentTemperatureC: hourly.apparent_temperature[index],
    windSpeedKph: hourly.wind_speed_10m[index],
    windDirectionDeg: hourly.wind_direction_10m[index],
    uvIndex: hourly.uv_index[index],
  });
}

function observeNullable(input: {
  time: string | undefined;
  temperatureC: number | null | undefined;
  humidityPct: number | null | undefined;
  apparentTemperatureC: number | null | undefined;
  windSpeedKph: number | null | undefined;
  windDirectionDeg: number | null | undefined;
  uvIndex: number | null | undefined;
}): WeatherObservation | null {
  if (
    input.time === undefined ||
    input.temperatureC == null ||
    input.humidityPct == null ||
    input.apparentTemperatureC == null ||
    input.windSpeedKph == null ||
    input.windDirectionDeg == null ||
    input.uvIndex == null
  ) {
    return null;
  }

  return observe({
    time: input.time,
    temperatureC: input.temperatureC,
    humidityPct: input.humidityPct,
    apparentTemperatureC: input.apparentTemperatureC,
    windSpeedKph: input.windSpeedKph,
    windDirectionDeg: input.windDirectionDeg,
    uvIndex: input.uvIndex,
  });
}

/**
 * First hourly slot at or after the start of the hour that contains `start`,
 * then the next `count - 1` hours. A 06:30 roll-out therefore includes 06:00.
 */
export function sliceHourlyFromStart(
  hourly: OpenMeteoHourly,
  start: Date,
  count = FORECAST_HOURS,
): { hours: WeatherObservation[] } | { error: string } {
  const hourStartMs = Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate(),
    start.getUTCHours(),
  );

  const startIndex = hourly.time.findIndex(
    (time) => parseOpenMeteoTime(time).getTime() >= hourStartMs,
  );

  if (startIndex === -1) {
    return {
      error:
        "startTime is after the end of the forecast window Open-Meteo returned.",
    };
  }

  const hours: WeatherObservation[] = [];

  for (let index = startIndex; index < hourly.time.length && hours.length < count; index += 1) {
    const observation = observeHourly(hourly, index);

    if (observation) {
      hours.push(observation);
    }
  }

  if (hours.length === 0) {
    return {
      error: "No complete hourly observations were available from startTime.",
    };
  }

  return { hours };
}

export function isOpenMeteoForecast(value: unknown): value is OpenMeteoForecast {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  const current = record.current;
  const hourly = record.hourly;

  if (typeof record.latitude !== "number" || typeof record.longitude !== "number") {
    return false;
  }

  if (typeof current !== "object" || current === null) {
    return false;
  }

  if (typeof hourly !== "object" || hourly === null) {
    return false;
  }

  const columns = hourly as Record<string, unknown>;

  return (
    Array.isArray(columns.time) &&
    Array.isArray(columns.temperature_2m) &&
    Array.isArray(columns.relative_humidity_2m) &&
    Array.isArray(columns.apparent_temperature) &&
    Array.isArray(columns.wind_speed_10m) &&
    Array.isArray(columns.wind_direction_10m) &&
    Array.isArray(columns.uv_index)
  );
}
