export type Surface = "road" | "gravel";
export type Intensity = "endurance" | "tempo" | "threshold";
export type SweatRate = "low" | "moderate" | "high";

export interface RouteSummary {
  name: string;
  region: string;
  /** Local time of the roll-out, e.g. "06:30". */
  startTime: string;
  distanceKm: number;
  elevationGainM: number;
  movingHours: number;
  surface: Surface;
  /** Heading of the longest sustained leg, used for head/tailwind maths. */
  outboundBearingDeg: number;
  lat: number;
  lng: number;
  timezone: string;
}

export interface HourlyConditions {
  /** Local time on the hour, e.g. "07:00". */
  time: string;
  tempC: number;
  feelsLikeC: number;
  windKph: number;
  gustKph: number;
  /** Bearing the wind blows *from*, as forecasts report it. */
  windFromDeg: number;
  precipChance: number;
  humidityPct: number;
  dewPointC: number;
  uvIndex: number;
}

export interface RiderProfile {
  weightKg: number;
  bikeWeightKg: number;
  tyreWidthMm: number;
  intensity: Intensity;
  sweatRate: SweatRate;
}

export interface Briefing {
  route: RouteSummary;
  /** One entry per hour of the ride window, in order. */
  hourly: HourlyConditions[];
  rider: RiderProfile;
}

export const INTENSITY_LABELS: Record<Intensity, string> = {
  endurance: "Endurance",
  tempo: "Tempo",
  threshold: "Threshold",
};

export const SURFACE_LABELS: Record<Surface, string> = {
  road: "Road",
  gravel: "Gravel",
};

/**
 * Rider defaults for the tire and fueling calculators. A briefing has no
 * route until the rider drops a GPX or pastes a Ride with GPS link.
 */
export const DEFAULT_START_TIME = "06:30";

export const defaultRider: RiderProfile = {
  weightKg: 74,
  bikeWeightKg: 8.2,
  tyreWidthMm: 28,
  intensity: "tempo",
  sweatRate: "moderate",
};
