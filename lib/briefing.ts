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
 * Stands in for the route and forecast APIs. Every value the briefing shows is
 * either read from here or derived from it, so wiring up a real response means
 * replacing this object at the page level and nothing else.
 */
export const defaultBriefing: Briefing = {
  route: {
    name: "Winnats Pass Loop",
    region: "Peak District, UK",
    startTime: "06:30",
    distanceKm: 78.4,
    elevationGainM: 1240,
    movingHours: 3.4,
    surface: "road",
    outboundBearingDeg: 292,
  },
  hourly: [
    {
      time: "06:00",
      tempC: 8.4,
      feelsLikeC: 5.2,
      windKph: 21,
      gustKph: 33,
      windFromDeg: 296,
      precipChance: 10,
    },
    {
      time: "07:00",
      tempC: 9.3,
      feelsLikeC: 6.1,
      windKph: 22,
      gustKph: 35,
      windFromDeg: 300,
      precipChance: 10,
    },
    {
      time: "08:00",
      tempC: 11.2,
      feelsLikeC: 8.3,
      windKph: 24,
      gustKph: 38,
      windFromDeg: 305,
      precipChance: 20,
    },
    {
      time: "09:00",
      tempC: 13.6,
      feelsLikeC: 11,
      windKph: 26,
      gustKph: 41,
      windFromDeg: 310,
      precipChance: 30,
    },
    {
      time: "10:00",
      tempC: 16,
      feelsLikeC: 13.8,
      windKph: 25,
      gustKph: 39,
      windFromDeg: 314,
      precipChance: 20,
    },
    {
      time: "11:00",
      tempC: 17.8,
      feelsLikeC: 16.1,
      windKph: 23,
      gustKph: 36,
      windFromDeg: 318,
      precipChance: 10,
    },
    {
      time: "12:00",
      tempC: 19.2,
      feelsLikeC: 17.7,
      windKph: 21,
      gustKph: 32,
      windFromDeg: 322,
      precipChance: 5,
    },
  ],
  rider: {
    weightKg: 74,
    bikeWeightKg: 8.2,
    tyreWidthMm: 28,
    intensity: "tempo",
    sweatRate: "moderate",
  },
};
