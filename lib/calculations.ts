/**
 * Ride-prep calculators used by the Tire Pressure and Fueling tabs.
 *
 * The tyre model follows Silca / SRAM public guidance: equal tyre drop at a
 * 40/60 front/rear load split, with pressure falling as the casing gets wider
 * and another step down on gravel (higher target drop). It is calibrated so a
 * 70 kg rider on an 8 kg bike with 28 mm road tyres lands near Silca's
 * published ~62 / 73 psi.
 *
 * Fuelling follows ACSM/ISSN 30–90 g carbohydrate per hour on rides over
 * 90 minutes, scaled by target watts, ride length, and a GI-tolerance slider.
 * Fluid and sodium rise with air temperature, dew point and power.
 */

export type TireSetup = "tubeless" | "clincher";

export interface TirePressureInput {
  riderWeightKg: number;
  bikeWeightKg: number;
  tireWidthMm: number;
  isGravel: boolean;
  /** Internal rim width. 19 mm matches the Silca 28 mm road calibration. */
  rimInnerWidthMm?: number;
  setup?: TireSetup;
}

export interface TirePressureResult {
  frontPsi: number;
  rearPsi: number;
}

export interface FuelingInput {
  durationHours: number;
  temperatureC: number;
  targetWatts: number;
  dewPointC?: number;
  humidityPct?: number;
  /** 0 = gut-limited 30 g/hr, 1 = full ACSM/ISSN target. */
  giTolerance?: number;
  sweatRate?: "low" | "moderate" | "high";
}

export interface FuelingResult {
  carbsPerHour: number;
  fluidMlPerHour: number;
  sodiumPerHourMg: number;
  energyKj: number;
}

/** Rear wheel carries ~60 % of system load on a typical drop-bar bike. */
export const REAR_LOAD_FRACTION = 0.6;
export const FRONT_LOAD_FRACTION = 1 - REAR_LOAD_FRACTION;

const ROAD_REF_WIDTH_MM = 28;
const ROAD_REF_SYSTEM_KG = 78;
const ROAD_REF_REAR_PSI = 73;

/** Gravel targets ~20 % drop vs ~15 % on road, i.e. about 75 % of road pressure. */
const GRAVEL_PRESSURE_FACTOR = 0.75;

const MIN_PSI = 18;
const MAX_PSI = 110;

const MIN_CARBS_G = 30;
const MAX_CARBS_G = 90;

/** Watts at the bottom and top of the 30–90 g/hr carbohydrate range. */
const CARBS_WATTS_FLOOR = 120;
const CARBS_WATTS_CEILING = 300;

const BASE_FLUID_ML = 500;
const FLUID_REF_TEMP_C = 15;
const FLUID_ML_PER_DEGREE = 25;
const FLUID_REF_WATTS = 180;
const MIN_FLUID_ML = 350;
const MAX_FLUID_ML = 1200;

const RIM_REF_INNER_MM = 19;
const TUBELESS_FACTOR = 0.96;

const SODIUM_BY_SWEAT: Record<"low" | "moderate" | "high", number> = {
  low: 400,
  moderate: 600,
  high: 850,
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function pressureForLoadKg(
  loadKg: number,
  tireWidthMm: number,
  isGravel: boolean,
  rimInnerWidthMm: number,
  setup: TireSetup,
): number {
  const widthMm = clamp(tireWidthMm, 23, 64);
  const widthFactor = (ROAD_REF_WIDTH_MM / widthMm) ** 1.7;
  const surfaceFactor = isGravel ? GRAVEL_PRESSURE_FACTOR : 1;
  const rimMm = clamp(rimInnerWidthMm, 15, 35);
  const rimFactor = (RIM_REF_INNER_MM / rimMm) ** 0.35;
  const setupFactor = setup === "tubeless" ? TUBELESS_FACTOR : 1;
  const psiPerKg =
    ROAD_REF_REAR_PSI / (ROAD_REF_SYSTEM_KG * REAR_LOAD_FRACTION);

  return loadKg * psiPerKg * widthFactor * surfaceFactor * rimFactor * setupFactor;
}

export function calculateTirePressure({
  riderWeightKg,
  bikeWeightKg,
  tireWidthMm,
  isGravel,
  rimInnerWidthMm = RIM_REF_INNER_MM,
  setup = "clincher",
}: TirePressureInput): TirePressureResult {
  const systemKg = Math.max(0, riderWeightKg) + Math.max(0, bikeWeightKg);
  const frontPsi = pressureForLoadKg(
    systemKg * FRONT_LOAD_FRACTION,
    tireWidthMm,
    isGravel,
    rimInnerWidthMm,
    setup,
  );
  const rearPsi = pressureForLoadKg(
    systemKg * REAR_LOAD_FRACTION,
    tireWidthMm,
    isGravel,
    rimInnerWidthMm,
    setup,
  );

  return {
    frontPsi: clamp(Math.round(frontPsi), MIN_PSI, MAX_PSI),
    rearPsi: clamp(Math.round(rearPsi), MIN_PSI, MAX_PSI),
  };
}

export function calculateFueling({
  durationHours,
  temperatureC,
  targetWatts,
  dewPointC,
  giTolerance = 1,
  sweatRate = "moderate",
}: FuelingInput): FuelingResult {
  const watts = clamp(targetWatts, 0, 500);
  const intensity = clamp(
    (watts - CARBS_WATTS_FLOOR) / (CARBS_WATTS_CEILING - CARBS_WATTS_FLOOR),
    0,
    1,
  );

  // Long rides sit a little higher in the range — you cannot catch up later.
  const durationBump = durationHours >= 4 ? 10 : durationHours >= 2.5 ? 5 : 0;
  const scientificCarbs = clamp(
    Math.round(MIN_CARBS_G + intensity * (MAX_CARBS_G - MIN_CARBS_G) + durationBump),
    MIN_CARBS_G,
    MAX_CARBS_G,
  );
  const gut = clamp(giTolerance, 0, 1);
  const carbsPerHour = clamp(
    Math.round(MIN_CARBS_G + (scientificCarbs - MIN_CARBS_G) * gut),
    MIN_CARBS_G,
    MAX_CARBS_G,
  );

  const dew = dewPointC ?? temperatureC - 4;
  const dewBump = dew >= 21 ? 1.3 : dew >= 16 ? 1.15 : 1;
  const tempTerm = BASE_FLUID_ML + (temperatureC - FLUID_REF_TEMP_C) * FLUID_ML_PER_DEGREE;
  const sweatFromWatts = clamp(1 + (watts - FLUID_REF_WATTS) / 400, 0.7, 1.4);
  const fluidMlPerHour = clamp(
    roundTo(tempTerm * sweatFromWatts * dewBump, 10),
    MIN_FLUID_ML,
    MAX_FLUID_ML,
  );
  const sodiumPerHourMg = Math.round(
    SODIUM_BY_SWEAT[sweatRate] + (dew >= 16 ? 150 : 0) + (temperatureC > 20 ? 150 : 0),
  );
  const energyKj = Math.round(watts * Math.max(durationHours, 0) * 3.6);

  return { carbsPerHour, fluidMlPerHour, sodiumPerHourMg, energyKj };
}
