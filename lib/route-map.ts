/**
 * Project a GPX/RWGPS track onto a web-mercator map and place one wind
 * arrow per forecast hour. Tiles are Carto Dark Matter (OSM data).
 */

import type { HourlyConditions } from "./briefing.ts";
import {
  bearingDeg,
  pointAtDistance,
  sampleHourlyPoints,
  totalDistanceKm,
  type GeoPoint,
} from "./geo.ts";
import { bearingDifference, normaliseBearing } from "./units.ts";

export const TILE_SIZE = 256;
export const MIN_MAP_ZOOM = 3;
export const MAX_MAP_ZOOM = 16;

export type WindOnCourse = "headwind" | "crosswind" | "tailwind";

export interface LatLngBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface MapView {
  zoom: number;
  originX: number;
  originY: number;
  width: number;
  height: number;
}

export interface WindArrow {
  point: GeoPoint;
  time: string;
  fromDeg: number;
  towardsDeg: number;
  windKph: number;
  relation: WindOnCourse;
}

export interface MapTile {
  z: number;
  x: number;
  y: number;
  left: number;
  top: number;
}

export function windOnCourse(
  travelDeg: number,
  windFromDeg: number,
): WindOnCourse {
  const difference = bearingDifference(travelDeg, windFromDeg);

  if (difference <= 45) {
    return "headwind";
  }

  return difference <= 135 ? "crosswind" : "tailwind";
}

export function downsampleTrack(points: GeoPoint[], maxPoints = 200): GeoPoint[] {
  if (points.length <= maxPoints) {
    return points;
  }

  const step = (points.length - 1) / (maxPoints - 1);
  const sampled: GeoPoint[] = [];

  for (let index = 0; index < maxPoints; index += 1) {
    sampled.push(points[Math.round(index * step)]);
  }

  return sampled;
}

export function boundsOf(points: GeoPoint[]): LatLngBounds {
  if (points.length === 0) {
    return { minLat: 0, maxLat: 0, minLng: 0, maxLng: 0 };
  }

  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLng = points[0].lng;
  let maxLng = points[0].lng;

  for (const point of points) {
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLng = Math.min(minLng, point.lng);
    maxLng = Math.max(maxLng, point.lng);
  }

  // A single pin still needs a neighbourhood so the tiles have context.
  if (maxLat - minLat < 0.02) {
    const pad = (0.02 - (maxLat - minLat)) / 2;
    minLat -= pad;
    maxLat += pad;
  }

  if (maxLng - minLng < 0.02) {
    const pad = (0.02 - (maxLng - minLng)) / 2;
    minLng -= pad;
    maxLng += pad;
  }

  return { minLat, maxLat, minLng, maxLng };
}

/** Web-mercator world pixels at this zoom (origin is the north-west corner). */
export function latLngToWorld(
  lat: number,
  lng: number,
  zoom: number,
): { x: number; y: number } {
  const n = 2 ** zoom;
  const clampedLat = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const sin = Math.sin((clampedLat * Math.PI) / 180);

  return {
    x: ((lng + 180) / 360) * n * TILE_SIZE,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * n * TILE_SIZE,
  };
}

export function fitMapView(
  bounds: LatLngBounds,
  width: number,
  height: number,
  padding = 32,
): MapView {
  const innerWidth = Math.max(64, width - padding * 2);
  const innerHeight = Math.max(64, height - padding * 2);
  let zoom = MAX_MAP_ZOOM;

  for (let candidate = MAX_MAP_ZOOM; candidate >= MIN_MAP_ZOOM; candidate -= 1) {
    const southWest = latLngToWorld(bounds.minLat, bounds.minLng, candidate);
    const northEast = latLngToWorld(bounds.maxLat, bounds.maxLng, candidate);
    const spanX = Math.abs(northEast.x - southWest.x);
    const spanY = Math.abs(southWest.y - northEast.y);

    if (spanX <= innerWidth && spanY <= innerHeight) {
      zoom = candidate;
      break;
    }

    zoom = candidate;
  }

  const southWest = latLngToWorld(bounds.minLat, bounds.minLng, zoom);
  const northEast = latLngToWorld(bounds.maxLat, bounds.maxLng, zoom);
  const centerX = (southWest.x + northEast.x) / 2;
  const centerY = (southWest.y + northEast.y) / 2;

  return {
    zoom,
    originX: centerX - width / 2,
    originY: centerY - height / 2,
    width,
    height,
  };
}

export function projectPoint(
  point: GeoPoint,
  view: MapView,
): { x: number; y: number } {
  const world = latLngToWorld(point.lat, point.lng, view.zoom);

  return {
    x: world.x - view.originX,
    y: world.y - view.originY,
  };
}

export function tilesForView(view: MapView): MapTile[] {
  const maxIndex = 2 ** view.zoom - 1;
  const minX = Math.floor(view.originX / TILE_SIZE);
  const maxX = Math.floor((view.originX + view.width) / TILE_SIZE);
  const minY = Math.floor(view.originY / TILE_SIZE);
  const maxY = Math.floor((view.originY + view.height) / TILE_SIZE);
  const tiles: MapTile[] = [];

  for (let y = minY; y <= maxY; y += 1) {
    if (y < 0 || y > maxIndex) {
      continue;
    }

    for (let x = minX; x <= maxX; x += 1) {
      const wrappedX = ((x % (maxIndex + 1)) + (maxIndex + 1)) % (maxIndex + 1);

      tiles.push({
        z: view.zoom,
        x: wrappedX,
        y,
        left: x * TILE_SIZE - view.originX,
        top: y * TILE_SIZE - view.originY,
      });
    }
  }

  return tiles;
}

export function tileUrl(tile: MapTile): string {
  return `/api/map-tile?z=${tile.z}&x=${tile.x}&y=${tile.y}`;
}

export function headingNear(
  points: GeoPoint[],
  atKm: number,
): number {
  if (points.length < 2) {
    return 0;
  }

  const total = totalDistanceKm(points);
  const lookAheadKm = Math.max(0.25, total * 0.02);
  const here = pointAtDistance(points, atKm);
  const ahead = pointAtDistance(points, Math.min(total, atKm + lookAheadKm));

  if (here.lat === ahead.lat && here.lng === ahead.lng) {
    const back = pointAtDistance(points, Math.max(0, atKm - lookAheadKm));

    return bearingDeg(back, here);
  }

  return bearingDeg(here, ahead);
}

export function windArrowsAlongRoute(
  points: GeoPoint[],
  hourly: HourlyConditions[],
  movingHours: number,
): WindArrow[] {
  if (hourly.length === 0 || points.length === 0) {
    return [];
  }

  if (points.length < 2) {
    const strongest = hourly.reduce((peak, hour) =>
      hour.windKph > peak.windKph ? hour : peak,
    );

    return [
      {
        point: points[0],
        time: strongest.time,
        fromDeg: strongest.windFromDeg,
        towardsDeg: normaliseBearing(strongest.windFromDeg + 180),
        windKph: strongest.windKph,
        relation: "crosswind",
      },
    ];
  }

  const samples = sampleHourlyPoints(points, hourly.length, movingHours);
  const total = totalDistanceKm(points);
  const duration = Math.max(movingHours, 0.5);

  return hourly.map((hour, index) => {
    const atKm = (index / duration) * total;
    const point = samples[index] ?? pointAtDistance(points, atKm);
    const travel = headingNear(points, atKm);

    return {
      point,
      time: hour.time,
      fromDeg: hour.windFromDeg,
      towardsDeg: normaliseBearing(hour.windFromDeg + 180),
      windKph: hour.windKph,
      relation: windOnCourse(travel, hour.windFromDeg),
    };
  });
}
