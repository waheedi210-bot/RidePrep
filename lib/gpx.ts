import {
  bearingDeg,
  elevationGainM,
  estimateMovingHours,
  pointAtDistance,
  totalDistanceKm,
  type GeoPoint,
} from "./geo.ts";

export interface ParsedRoute {
  name: string;
  points: GeoPoint[];
  distanceKm: number;
  elevationGainM: number;
  movingHours: number;
  outboundBearingDeg: number;
  lat: number;
  lng: number;
}

function attribute(tag: string, name: string): string | null {
  const match = new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, "i").exec(tag);

  return match ? match[1] : null;
}

function innerTag(xml: string, tag: string): string | null {
  const match = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i").exec(xml);

  return match ? match[1].trim() : null;
}

function parseTaggedPoints(xml: string, tag: "trkpt" | "rtept" | "wpt"): GeoPoint[] {
  const points: GeoPoint[] = [];
  const pattern = new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)</${tag}>`, "gi");
  let match: RegExpExecArray | null = pattern.exec(xml);

  while (match) {
    const lat = Number(attribute(match[1], "lat"));
    const lng = Number(attribute(match[1], "lon"));

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const eleRaw = innerTag(match[2], "ele");
      const eleM = eleRaw != null && eleRaw !== "" ? Number(eleRaw) : undefined;

      points.push({
        lat,
        lng,
        eleM: eleM != null && Number.isFinite(eleM) ? eleM : undefined,
      });
    }

    match = pattern.exec(xml);
  }

  return points;
}

function parsePoints(xml: string): GeoPoint[] {
  const track = parseTaggedPoints(xml, "trkpt");

  if (track.length >= 2) {
    return track;
  }

  const route = parseTaggedPoints(xml, "rtept");

  if (route.length >= 2) {
    return route;
  }

  return parseTaggedPoints(xml, "wpt");
}

function parseName(xml: string, fallback: string): string {
  const metadata = /<metadata\b[\s\S]*?<\/metadata>/i.exec(xml)?.[0] ?? "";
  const fromMeta = innerTag(metadata, "name");

  if (fromMeta) {
    return fromMeta;
  }

  const fromTrk = innerTag(/<trk\b[\s\S]*?<\/trk>/i.exec(xml)?.[0] ?? "", "name");

  return fromTrk || fallback;
}

export function parseGpx(xml: string, fallbackName = "Imported route"): ParsedRoute {
  const points = parsePoints(xml);

  if (points.length < 2) {
    throw new Error("That GPX file does not contain a usable track.");
  }

  const distanceKm = Math.round(totalDistanceKm(points) * 10) / 10;
  const along = pointAtDistance(points, Math.max(distanceKm * 0.2, 0.3));
  const isGravel = /gravel/i.test(xml);

  return {
    name: parseName(xml, fallbackName),
    points,
    distanceKm,
    elevationGainM: elevationGainM(points),
    movingHours: estimateMovingHours(distanceKm, isGravel),
    outboundBearingDeg: Math.round(bearingDeg(points[0], along)),
    lat: points[0].lat,
    lng: points[0].lng,
  };
}
