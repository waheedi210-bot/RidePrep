/**
 * Open-Meteo / CAMS air quality for the Environmental Health module.
 *
 * US AQI bands are EPA. Pollen grains/m³ are CAMS Europe only — US routes
 * get AQI, PM2.5, ozone and dust, and the pollen rows stay hidden.
 */

import { formatHourLabel } from "./datetime.ts";
import {
  OPEN_METEO_AIR_URL,
  OpenMeteoError,
  fetchOpenMeteoJson,
} from "./open-meteo.ts";
import {
  parseOpenMeteoTime,
  toIsoUtc,
  type WeatherQuery,
} from "./weather.ts";

export type AqiBand =
  | "good"
  | "moderate"
  | "usg"
  | "unhealthy"
  | "very-unhealthy"
  | "hazardous";

export type AirSeverity = "ok" | "watch" | "caution" | "stop";
export type PollenLevel = "none" | "low" | "moderate" | "high" | "very-high";
export type AirPollutant = "ozone" | "particles" | "mixed";

export const AQI_LABELS: Record<AqiBand, string> = {
  good: "Good",
  moderate: "Moderate",
  usg: "Unhealthy for sensitive groups",
  unhealthy: "Unhealthy",
  "very-unhealthy": "Very unhealthy",
  hazardous: "Hazardous",
};

export const POLLEN_LABELS: Record<PollenLevel, string> = {
  none: "None",
  low: "Low",
  moderate: "Moderate",
  high: "High",
  "very-high": "Very high",
};

export interface AirObservation {
  time: string;
  usAqi: number;
  usAqiPm25: number | null;
  usAqiOzone: number | null;
  pm25: number;
  ozone: number;
  dust: number | null;
  grassPollen: number | null;
  treePollen: number | null;
  weedPollen: number | null;
}

export interface AirQualityPayload {
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
  current: AirObservation;
  hours: AirObservation[];
}

export interface PollenReading {
  kind: "Grass" | "Tree" | "Weed";
  grains: number;
  level: PollenLevel;
}

export interface AirHealthAdvice {
  usAqi: number;
  startAqi: number;
  band: AqiBand;
  bandLabel: string;
  peakTime: string;
  pm25: number;
  ozone: number;
  dust: number | null;
  pollutant: AirPollutant;
  pollen: PollenReading[];
  headline: string;
  detail: string;
  severity: AirSeverity;
}

export interface OpenMeteoAirCurrent {
  time: string;
  us_aqi: number | null;
  us_aqi_pm2_5?: number | null;
  us_aqi_ozone?: number | null;
  pm2_5: number | null;
  ozone?: number | null;
  dust?: number | null;
  alder_pollen?: number | null;
  birch_pollen?: number | null;
  grass_pollen?: number | null;
  mugwort_pollen?: number | null;
  olive_pollen?: number | null;
  ragweed_pollen?: number | null;
}

export interface OpenMeteoAirHourly {
  time: string[];
  us_aqi: Array<number | null>;
  us_aqi_pm2_5?: Array<number | null>;
  us_aqi_ozone?: Array<number | null>;
  pm2_5: Array<number | null>;
  ozone?: Array<number | null>;
  dust?: Array<number | null>;
  alder_pollen?: Array<number | null>;
  birch_pollen?: Array<number | null>;
  grass_pollen?: Array<number | null>;
  mugwort_pollen?: Array<number | null>;
  olive_pollen?: Array<number | null>;
  ragweed_pollen?: Array<number | null>;
}

export interface OpenMeteoAirQuality {
  latitude: number;
  longitude: number;
  elevation: number;
  timezone: string;
  current: OpenMeteoAirCurrent;
  hourly: OpenMeteoAirHourly;
}

const AQ_CURRENT = ["us_aqi", "us_aqi_pm2_5", "us_aqi_ozone", "pm2_5", "ozone", "dust"] as const;

const AQ_HOURLY = [
  ...AQ_CURRENT,
  "alder_pollen",
  "birch_pollen",
  "grass_pollen",
  "mugwort_pollen",
  "olive_pollen",
  "ragweed_pollen",
] as const;

export function usAqiBand(aqi: number): AqiBand {
  if (aqi <= 50) {
    return "good";
  }
  if (aqi <= 100) {
    return "moderate";
  }
  if (aqi <= 150) {
    return "usg";
  }
  if (aqi <= 200) {
    return "unhealthy";
  }
  if (aqi <= 300) {
    return "very-unhealthy";
  }

  return "hazardous";
}

export function aqiSeverity(band: AqiBand): AirSeverity {
  if (band === "good") {
    return "ok";
  }
  if (band === "moderate") {
    return "watch";
  }
  if (band === "usg") {
    return "caution";
  }

  return "stop";
}

/**
 * CAMS-style grains/m³ buckets, slightly conservative for riders (high
 * ventilation). Same scale for grass, tree and weed so the briefing stays
 * readable.
 */
export function pollenLevel(grains: number | null | undefined): PollenLevel | null {
  if (grains == null || !Number.isFinite(grains)) {
    return null;
  }
  if (grains <= 0) {
    return "none";
  }
  if (grains < 20) {
    return "low";
  }
  if (grains < 50) {
    return "moderate";
  }
  if (grains < 100) {
    return "high";
  }

  return "very-high";
}

function maxFinite(values: Array<number | null | undefined>): number | null {
  let peak: number | null = null;

  for (const value of values) {
    if (value == null || !Number.isFinite(value)) {
      continue;
    }

    peak = peak === null ? value : Math.max(peak, value);
  }

  return peak;
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

export function observeAir(
  input: {
    time: string;
    usAqi: number;
    usAqiPm25?: number | null;
    usAqiOzone?: number | null;
    pm25: number;
    ozone?: number | null;
    dust?: number | null;
    alderPollen?: number | null;
    birchPollen?: number | null;
    grassPollen?: number | null;
    mugwortPollen?: number | null;
    olivePollen?: number | null;
    ragweedPollen?: number | null;
    timeZone?: string;
  },
): AirObservation {
  const zone = input.timeZone ?? "UTC";

  return {
    time: toIsoUtc(input.time, zone),
    usAqi: Math.round(input.usAqi),
    usAqiPm25:
      input.usAqiPm25 == null ? null : Math.round(input.usAqiPm25),
    usAqiOzone:
      input.usAqiOzone == null ? null : Math.round(input.usAqiOzone),
    pm25: roundOne(input.pm25),
    ozone: roundOne(input.ozone ?? 0),
    dust: input.dust == null ? null : roundOne(input.dust),
    grassPollen: input.grassPollen == null ? null : roundOne(input.grassPollen),
    treePollen: maxFinite([input.alderPollen, input.birchPollen, input.olivePollen]),
    weedPollen: maxFinite([input.mugwortPollen, input.ragweedPollen]),
  };
}

function observeAirNullable(
  input: {
    time: string | undefined;
    usAqi: number | null | undefined;
    usAqiPm25?: number | null;
    usAqiOzone?: number | null;
    pm25: number | null | undefined;
    ozone?: number | null;
    dust?: number | null;
    alderPollen?: number | null;
    birchPollen?: number | null;
    grassPollen?: number | null;
    mugwortPollen?: number | null;
    olivePollen?: number | null;
    ragweedPollen?: number | null;
    timeZone?: string;
  },
): AirObservation | null {
  if (input.time === undefined || input.usAqi == null || input.pm25 == null) {
    return null;
  }

  return observeAir({
    time: input.time,
    usAqi: input.usAqi,
    usAqiPm25: input.usAqiPm25,
    usAqiOzone: input.usAqiOzone,
    pm25: input.pm25,
    ozone: input.ozone,
    dust: input.dust,
    alderPollen: input.alderPollen,
    birchPollen: input.birchPollen,
    grassPollen: input.grassPollen,
    mugwortPollen: input.mugwortPollen,
    olivePollen: input.olivePollen,
    ragweedPollen: input.ragweedPollen,
    timeZone: input.timeZone,
  });
}

export function observeAirCurrent(
  current: OpenMeteoAirCurrent,
  timeZone = "UTC",
): AirObservation | null {
  return observeAirNullable({
    time: current.time,
    usAqi: current.us_aqi,
    usAqiPm25: current.us_aqi_pm2_5,
    usAqiOzone: current.us_aqi_ozone,
    pm25: current.pm2_5,
    ozone: current.ozone,
    dust: current.dust,
    alderPollen: current.alder_pollen,
    birchPollen: current.birch_pollen,
    grassPollen: current.grass_pollen,
    mugwortPollen: current.mugwort_pollen,
    olivePollen: current.olive_pollen,
    ragweedPollen: current.ragweed_pollen,
    timeZone,
  });
}

export function observeAirHourly(
  hourly: OpenMeteoAirHourly,
  index: number,
  timeZone = "UTC",
): AirObservation | null {
  return observeAirNullable({
    time: hourly.time[index],
    usAqi: hourly.us_aqi[index],
    usAqiPm25: hourly.us_aqi_pm2_5?.[index],
    usAqiOzone: hourly.us_aqi_ozone?.[index],
    pm25: hourly.pm2_5[index],
    ozone: hourly.ozone?.[index],
    dust: hourly.dust?.[index],
    alderPollen: hourly.alder_pollen?.[index],
    birchPollen: hourly.birch_pollen?.[index],
    grassPollen: hourly.grass_pollen?.[index],
    mugwortPollen: hourly.mugwort_pollen?.[index],
    olivePollen: hourly.olive_pollen?.[index],
    ragweedPollen: hourly.ragweed_pollen?.[index],
    timeZone,
  });
}

export function sliceAirHourlyFromStart(
  hourly: OpenMeteoAirHourly,
  start: Date,
  count: number,
  timeZone = "UTC",
): { hours: AirObservation[] } | { error: string } {
  const hourStartMs = Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate(),
    start.getUTCHours(),
  );

  const startIndex = hourly.time.findIndex(
    (time) => parseOpenMeteoTime(time, timeZone).getTime() >= hourStartMs,
  );

  if (startIndex === -1) {
    return {
      error:
        "startTime is after the end of the air-quality window Open-Meteo returned.",
    };
  }

  const hours: AirObservation[] = [];

  for (
    let index = startIndex;
    index < hourly.time.length && hours.length < count;
    index += 1
  ) {
    const observation = observeAirHourly(hourly, index, timeZone);

    if (observation) {
      hours.push(observation);
    }
  }

  if (hours.length === 0) {
    return {
      error: "No complete hourly air-quality observations were available from startTime.",
    };
  }

  return { hours };
}

export function isOpenMeteoAirQuality(value: unknown): value is OpenMeteoAirQuality {
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

  return Array.isArray(columns.time) && Array.isArray(columns.us_aqi) && Array.isArray(columns.pm2_5);
}

export async function fetchOpenMeteoAirQuality(
  lat: number,
  lng: number,
): Promise<OpenMeteoAirQuality> {
  const url = new URL(OPEN_METEO_AIR_URL);

  url.searchParams.set("latitude", lat.toFixed(4));
  url.searchParams.set("longitude", lng.toFixed(4));
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("timeformat", "iso8601");
  url.searchParams.set("forecast_days", "7");
  url.searchParams.set("domains", "auto");
  url.searchParams.set("current", AQ_CURRENT.join(","));
  url.searchParams.set("hourly", AQ_HOURLY.join(","));

  const body = await fetchOpenMeteoJson(url);

  if (!isOpenMeteoAirQuality(body)) {
    throw new OpenMeteoError(
      "Open-Meteo returned an unexpected air-quality shape.",
      502,
      "UPSTREAM_ERROR",
    );
  }

  return body;
}

export async function loadAirQuality(options: WeatherQuery & { startTime: Date }): Promise<AirQualityPayload> {
  const forecast = await fetchOpenMeteoAirQuality(options.lat, options.lng);
  const current = observeAirCurrent(forecast.current, forecast.timezone);

  if (!current) {
    throw new Error("Open-Meteo omitted the current air-quality observation.");
  }

  const sliced = sliceAirHourlyFromStart(
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

function collectPollen(hours: AirObservation[]): PollenReading[] {
  const readings: PollenReading[] = [];
  const kinds: Array<[PollenReading["kind"], number | null]> = [
    ["Grass", maxFinite(hours.map((hour) => hour.grassPollen))],
    ["Tree", maxFinite(hours.map((hour) => hour.treePollen))],
    ["Weed", maxFinite(hours.map((hour) => hour.weedPollen))],
  ];

  for (const [kind, grains] of kinds) {
    const level = pollenLevel(grains);

    if (grains == null || level === null) {
      continue;
    }

    readings.push({ kind, grains, level });
  }

  return readings;
}

function dominantPollutant(hours: AirObservation[]): AirPollutant {
  const ozone = Math.max(...hours.map((hour) => hour.usAqiOzone ?? 0));
  const particles = Math.max(...hours.map((hour) => hour.usAqiPm25 ?? 0));

  if (ozone === 0 && particles === 0) {
    return "mixed";
  }

  if (ozone >= particles + 10) {
    return "ozone";
  }

  if (particles >= ozone + 10) {
    return "particles";
  }

  return "mixed";
}

function pollenSeverity(pollen: PollenReading[]): AirSeverity {
  const worst = pollen.reduce<PollenLevel>((level, reading) => {
    const order: PollenLevel[] = ["none", "low", "moderate", "high", "very-high"];

    return order.indexOf(reading.level) > order.indexOf(level) ? reading.level : level;
  }, "none");

  if (worst === "very-high" || worst === "high") {
    return "caution";
  }
  if (worst === "moderate") {
    return "watch";
  }

  return "ok";
}

function worseSeverity(left: AirSeverity, right: AirSeverity): AirSeverity {
  const order: AirSeverity[] = ["ok", "watch", "caution", "stop"];

  return order.indexOf(left) >= order.indexOf(right) ? left : right;
}

export function recommendAirHealth(
  hours: AirObservation[],
  timeZone: string,
): AirHealthAdvice | null {
  if (hours.length === 0) {
    return null;
  }

  const peak = hours.reduce((worst, hour) => (hour.usAqi > worst.usAqi ? hour : worst));
  const band = usAqiBand(peak.usAqi);
  const pollen = collectPollen(hours);
  const pollutant = dominantPollutant(hours);
  const peakPollen = pollen.reduce<PollenReading | null>((worst, reading) => {
    if (!worst) {
      return reading;
    }

    const order: PollenLevel[] = ["none", "low", "moderate", "high", "very-high"];

    return order.indexOf(reading.level) > order.indexOf(worst.level) ? reading : worst;
  }, null);

  const severity = worseSeverity(aqiSeverity(band), pollenSeverity(pollen));
  const peakTime = formatHourLabel(new Date(peak.time), timeZone);
  const dust = maxFinite(hours.map((hour) => hour.dust));

  let headline: string;
  let detail: string;

  switch (band) {
    case "good":
      headline = `Air is good — US AQI ${peak.usAqi}`;
      detail = "Ride as planned. US AQI stays in the good range through this window.";
      break;
    case "moderate":
      headline = `Air is moderate — US AQI ${peak.usAqi} at ${peakTime}`;
      detail =
        "Fine for most riders. Ease off on the climbs if you are smoke-sensitive.";
      break;
    case "usg":
      headline = `Unhealthy for sensitive groups — US AQI ${peak.usAqi} at ${peakTime}`;
      detail =
        "Skip threshold efforts. A light buff helps in the valleys if the air sits still.";
      break;
    case "unhealthy":
      headline = `Unhealthy air — US AQI ${peak.usAqi} at ${peakTime}`;
      detail = "Shorten or skip this ride. Do not sit at tempo in it.";
      break;
    default:
      headline = `Do not ride — US AQI ${peak.usAqi} (${AQI_LABELS[band].toLowerCase()})`;
      detail = "Air is past the point where a gran fondo is a good idea. Move the start or stay in.";
      break;
  }

  if (pollutant === "ozone" && band !== "good") {
    detail +=
      " Ozone is the limiter — it usually climbs through the afternoon, so the first hours are cleaner.";
  } else if (pollutant === "particles" && band !== "good") {
    detail += " Fine particles are the limiter — smoke or haze, not just a hot afternoon.";
  }

  if (peakPollen && (peakPollen.level === "high" || peakPollen.level === "very-high")) {
    detail += ` ${peakPollen.kind} pollen is ${peakPollen.level.replace("-", " ")} — take antihistamine before the roll-out.`;
  } else if (peakPollen && peakPollen.level === "moderate") {
    detail += ` ${peakPollen.kind} pollen is moderate — take your usual antihistamine if you have one.`;
  }

  if (dust != null && dust >= 50) {
    detail += " Dust is elevated — a light buff helps on the farm-road sections.";
  }

  return {
    usAqi: peak.usAqi,
    startAqi: hours[0].usAqi,
    band,
    bandLabel: AQI_LABELS[band],
    peakTime,
    pm25: Math.max(...hours.map((hour) => hour.pm25)),
    ozone: Math.max(...hours.map((hour) => hour.ozone)),
    dust,
    pollutant,
    pollen,
    headline,
    detail,
    severity,
  };
}
