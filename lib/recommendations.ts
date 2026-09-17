import type { Briefing, Intensity, SweatRate } from "./briefing.ts";
import {
  calculateFueling,
  calculateTirePressure,
} from "./calculations.ts";
import {
  averageBearing,
  bearingDifference,
  bearingToCompass,
  normaliseBearing,
  psiToBar,
} from "./units.ts";

export interface ApparelPick {
  slot: string;
  item: string;
  reason: string;
}

export interface ApparelAdvice {
  picks: ApparelPick[];
  startFeelsLikeC: number;
  peakFeelsLikeC: number;
  maxWindKph: number;
  maxGustKph: number;
  /** Null when it never warms past the shedding threshold. */
  shedAtTime: string | null;
}

export interface TyreAdvice {
  frontPsi: number;
  rearPsi: number;
  frontBar: number;
  rearBar: number;
  systemWeightKg: number;
  /** Null when rain is unlikely enough to ignore. */
  wetHint: string | null;
}

export type WindRelation = "headwind" | "crosswind" | "tailwind";

export interface WindAdvice {
  averageKph: number;
  maxGustKph: number;
  fromDeg: number;
  fromLabel: string;
  /** Bearing the wind blows towards, i.e. the vector to draw. */
  towardsDeg: number;
  outboundBearingDeg: number;
  returnBearingDeg: number;
  outboundLeg: WindRelation;
  returnLeg: WindRelation;
}

export interface FuelingAdvice {
  carbsPerHourG: number;
  fluidPerHourMl: number;
  sodiumPerHourMg: number;
  totalCarbsG: number;
  totalFluidMl: number;
  bottles: number;
  refills: number;
  averageTempC: number;
}

const SHED_THRESHOLD_C = 14;

const WATTS_BY_INTENSITY: Record<Intensity, number> = {
  endurance: 150,
  tempo: 210,
  threshold: 280,
};

const SODIUM_BY_SWEAT_RATE: Record<SweatRate, number> = {
  low: 400,
  moderate: 600,
  high: 850,
};

function classifyWind(travelBearing: number, windFromDeg: number): WindRelation {
  const difference = bearingDifference(travelBearing, windFromDeg);

  if (difference <= 45) {
    return "headwind";
  }

  return difference <= 135 ? "crosswind" : "tailwind";
}

export function recommendApparel({ hourly, route }: Briefing): ApparelAdvice {
  const startFeelsLikeC = hourly[0].feelsLikeC;
  const peakFeelsLikeC = Math.max(...hourly.map((hour) => hour.feelsLikeC));
  const maxWindKph = Math.max(...hourly.map((hour) => hour.windKph));
  const maxGustKph = Math.max(...hourly.map((hour) => hour.gustKph));

  // Riders dress for the roll-out and shed on the move, so the coldest
  // feels-like of the ride drives every pick.
  const jersey =
    startFeelsLikeC < 4
      ? "Thermal long-sleeve jersey"
      : startFeelsLikeC < 10
        ? "Long-sleeve jersey"
        : startFeelsLikeC < 16
          ? "Short-sleeve jersey with arm warmers"
          : startFeelsLikeC < 22
            ? "Short-sleeve jersey"
            : "Lightweight mesh jersey";

  const baseLayer =
    startFeelsLikeC < 4
      ? "Long-sleeve merino base layer"
      : startFeelsLikeC < 12
        ? "Short-sleeve merino base layer"
        : startFeelsLikeC < 19
          ? "Sleeveless mesh base layer"
          : "Skip the base layer";

  const windVest =
    maxWindKph >= 24 || startFeelsLikeC < 8
      ? "Packable wind vest, on from the start"
      : maxWindKph >= 15
        ? "Packable wind vest in a jersey pocket"
        : "Leave the vest at home";

  const shedAtTime =
    hourly.find((hour) => hour.feelsLikeC >= SHED_THRESHOLD_C)?.time ?? null;

  return {
    startFeelsLikeC,
    peakFeelsLikeC,
    maxWindKph,
    maxGustKph,
    shedAtTime,
    picks: [
      {
        slot: "Jersey",
        item: jersey,
        reason: `Feels like ${startFeelsLikeC}° at the ${route.startTime} roll-out, climbing to ${peakFeelsLikeC}°.`,
      },
      {
        slot: "Base layer",
        item: baseLayer,
        reason:
          "Moves sweat off the first climb so you are not wet when the wind hits the descent.",
      },
      {
        slot: "Wind vest",
        item: windVest,
        reason: `${maxWindKph} km/h wind with gusts to ${maxGustKph} km/h.`,
      },
    ],
  };
}

/**
 * Pressure for equal tyre drop at a 40/60 front/rear load split. Delegates
 * to the Silca / SRAM model in `calculations.ts`.
 */
export function recommendTyrePressure({
  rider,
  route,
  hourly,
}: Briefing): TyreAdvice {
  const { frontPsi, rearPsi } = calculateTirePressure({
    riderWeightKg: rider.weightKg,
    bikeWeightKg: rider.bikeWeightKg,
    tireWidthMm: rider.tyreWidthMm,
    isGravel: route.surface === "gravel",
  });
  const systemWeightKg = rider.weightKg + rider.bikeWeightKg;
  const wettestHour = hourly.reduce((wettest, hour) =>
    hour.precipChance > wettest.precipChance ? hour : wettest,
  );

  return {
    frontPsi,
    rearPsi,
    frontBar: psiToBar(frontPsi),
    rearBar: psiToBar(rearPsi),
    systemWeightKg,
    wetHint:
      wettestHour.precipChance >= 30
        ? `${wettestHour.precipChance}% chance of rain at ${wettestHour.time} — take 4 psi out of each tyre for grip on the descents.`
        : null,
  };
}

export function describeWind({ hourly, route }: Briefing): WindAdvice {
  const fromDeg = averageBearing(hourly.map((hour) => hour.windFromDeg));
  const returnBearingDeg = normaliseBearing(route.outboundBearingDeg + 180);

  return {
    averageKph: Math.round(
      hourly.reduce((total, hour) => total + hour.windKph, 0) / hourly.length,
    ),
    maxGustKph: Math.max(...hourly.map((hour) => hour.gustKph)),
    fromDeg,
    fromLabel: bearingToCompass(fromDeg),
    towardsDeg: normaliseBearing(fromDeg + 180),
    outboundBearingDeg: route.outboundBearingDeg,
    returnBearingDeg,
    outboundLeg: classifyWind(route.outboundBearingDeg, fromDeg),
    returnLeg: classifyWind(returnBearingDeg, fromDeg),
  };
}

export function recommendFueling({
  route,
  hourly,
  rider,
}: Briefing): FuelingAdvice {
  const averageTempC =
    hourly.reduce((total, hour) => total + hour.tempC, 0) / hourly.length;

  const { carbsPerHour, fluidMlPerHour } = calculateFueling({
    durationHours: route.movingHours,
    temperatureC: averageTempC,
    targetWatts: WATTS_BY_INTENSITY[rider.intensity],
  });

  const sodiumPerHourMg =
    SODIUM_BY_SWEAT_RATE[rider.sweatRate] + (averageTempC > 20 ? 150 : 0);

  const totalFluidMl = Math.round(fluidMlPerHour * route.movingHours);
  const bottles = Math.ceil(totalFluidMl / 500);

  return {
    carbsPerHourG: carbsPerHour,
    fluidPerHourMl: fluidMlPerHour,
    sodiumPerHourMg,
    totalCarbsG: Math.round(carbsPerHour * route.movingHours),
    totalFluidMl,
    bottles,
    refills: Math.max(0, bottles - 2),
    averageTempC,
  };
}
