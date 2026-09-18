const EARTH_RADIUS_KM = 6371;
const ELEVATION_NOISE_M = 3;

export interface GeoPoint {
  lat: number;
  lng: number;
  eleM?: number;
}

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function bearingDeg(from: GeoPoint, to: GeoPoint): number {
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);
  const dLng = toRadians(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;

  return ((bearing % 360) + 360) % 360;
}

export function cumulativeKm(points: GeoPoint[]): number[] {
  const distances = [0];

  for (let index = 1; index < points.length; index += 1) {
    distances.push(distances[index - 1] + haversineKm(points[index - 1], points[index]));
  }

  return distances;
}

export function totalDistanceKm(points: GeoPoint[]): number {
  const distances = cumulativeKm(points);

  return distances[distances.length - 1] ?? 0;
}

export function elevationGainM(points: GeoPoint[]): number {
  let gain = 0;

  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1].eleM;
    const next = points[index].eleM;

    if (prev == null || next == null) {
      continue;
    }

    const delta = next - prev;

    if (delta > ELEVATION_NOISE_M) {
      gain += delta;
    }
  }

  return Math.round(gain);
}

export function pointAtDistance(points: GeoPoint[], targetKm: number): GeoPoint {
  if (points.length === 0) {
    throw new Error("Cannot sample an empty track.");
  }

  const distances = cumulativeKm(points);
  const total = distances[distances.length - 1];

  if (total <= 0 || targetKm <= 0) {
    return points[0];
  }

  if (targetKm >= total) {
    return points[points.length - 1];
  }

  const index = distances.findIndex((distance) => distance >= targetKm);
  const end = Math.max(1, index);
  const start = end - 1;
  const span = distances[end] - distances[start];
  const ratio = span <= 0 ? 0 : (targetKm - distances[start]) / span;

  return {
    lat: points[start].lat + (points[end].lat - points[start].lat) * ratio,
    lng: points[start].lng + (points[end].lng - points[start].lng) * ratio,
    eleM:
      points[start].eleM != null && points[end].eleM != null
        ? points[start].eleM + (points[end].eleM - points[start].eleM) * ratio
        : points[end].eleM,
  };
}

/** One position per forecast hour, including the roll-out. */
export function sampleHourlyPoints(
  points: GeoPoint[],
  hours: number,
  movingHours: number,
): GeoPoint[] {
  const count = Math.max(1, hours);
  const duration = Math.max(movingHours, 0.5);
  const total = totalDistanceKm(points);
  const samples: GeoPoint[] = [];

  for (let hour = 0; hour < count; hour += 1) {
    samples.push(pointAtDistance(points, (hour / duration) * total));
  }

  return samples;
}

export function roundCoord(value: number, step = 0.05): number {
  return Math.round(value / step) * step;
}

export function spreadKm(points: GeoPoint[]): number {
  if (points.length === 0) {
    return 0;
  }

  return Math.max(...points.map((point) => haversineKm(points[0], point)));
}

export function estimateMovingHours(distanceKm: number, isGravel: boolean): number {
  const speedKph = isGravel ? 16 : 22;

  return Math.max(0.5, Math.round((distanceKm / speedKph) * 10) / 10);
}
