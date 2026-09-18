import {
  bearingDeg,
  estimateMovingHours,
  pointAtDistance,
  type GeoPoint,
} from "./geo.ts";

export interface RwgpsRoute {
  name: string;
  region: string;
  lat: number;
  lng: number;
  distanceKm: number;
  elevationGainM: number;
  movingHours: number;
  outboundBearingDeg: number;
  points: GeoPoint[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

function formatRegion(
  locality: string | null,
  area: string | null,
  country: string | null,
): string {
  const bits = [locality, area].filter((part): part is string => Boolean(part));

  if (bits.length > 0) {
    return bits.join(", ");
  }

  return country ?? "Imported route";
}

function parseTrackPoints(raw: unknown): GeoPoint[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const points: GeoPoint[] = [];

  for (const entry of raw) {
    const point = asRecord(entry);

    if (!point) {
      continue;
    }

    const lat = asNumber(point.y);
    const lng = asNumber(point.x);
    const eleM = asNumber(point.e) ?? undefined;

    if (lat == null || lng == null) {
      continue;
    }

    points.push({ lat, lng, eleM });
  }

  return points;
}

export function parseRwgpsJson(value: unknown): RwgpsRoute {
  const record = asRecord(value);

  if (!record) {
    throw new Error("Ride with GPS did not return a route.");
  }

  const points = parseTrackPoints(record.track_points);
  const lat = asNumber(record.first_lat) ?? points[0]?.lat;
  const lng = asNumber(record.first_lng) ?? points[0]?.lng;
  const distanceM = asNumber(record.distance);
  const elevationM = asNumber(record.elevation_gain);
  const name = asString(record.name) ?? "Imported route";

  if (points.length < 2 || lat == null || lng == null || distanceM == null) {
    throw new Error("Ride with GPS did not include a usable track.");
  }

  const distanceKm = Math.round((distanceM / 1000) * 10) / 10;
  const along = pointAtDistance(points, Math.max(distanceKm * 0.2, 0.3));
  const isGravel = /gravel/i.test(JSON.stringify(record.activity_types ?? ""));

  return {
    name,
    region: formatRegion(
      asString(record.locality),
      asString(record.administrative_area),
      asString(record.country_code),
    ),
    lat,
    lng,
    distanceKm,
    elevationGainM: Math.round(elevationM ?? 0),
    movingHours: estimateMovingHours(distanceKm, isGravel),
    outboundBearingDeg: Math.round(bearingDeg(points[0], along)),
    points,
  };
}
