import type { HourlyConditions } from "./briefing.ts";
import { kphToMph } from "./units.ts";

export interface WindChartPoint {
  time: string;
  label: string;
  speedMph: number;
  gustMph: number;
}

export function formatHourClock(timeHm: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(timeHm.trim());

  if (!match) {
    return timeHm;
  }

  const hour24 = Number(match[1]);
  const minutes = match[2];
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;

  return `${hour12}:${minutes} ${suffix}`;
}

export function niceWindMaxMph(maxMph: number): number {
  const padded = Math.max(10, maxMph);
  return Math.ceil(padded / 5) * 5;
}

export function windChartPoints(hourly: HourlyConditions[]): WindChartPoint[] {
  return hourly.map((hour) => ({
    time: hour.time,
    label: formatHourClock(hour.time),
    speedMph: kphToMph(hour.windKph),
    gustMph: kphToMph(Math.max(hour.gustKph, hour.windKph)),
  }));
}

export function xLabelIndexes(count: number): number[] {
  if (count <= 1) {
    return count === 1 ? [0] : [];
  }

  if (count <= 4) {
    return Array.from({ length: count }, (_, index) => index);
  }

  const step = Math.ceil((count - 1) / 3);
  const indexes = [0];

  for (let index = step; index < count - 1; index += step) {
    indexes.push(index);
  }

  if (indexes[indexes.length - 1] !== count - 1) {
    indexes.push(count - 1);
  }

  return indexes;
}

export function yTicks(maxMph: number): number[] {
  const steps = maxMph <= 15 ? 5 : maxMph <= 30 ? 5 : 10;
  const ticks: number[] = [];

  for (let value = 0; value <= maxMph; value += steps) {
    ticks.push(value);
  }

  return ticks;
}

export function seriesPath(
  values: number[],
  maxMph: number,
  left: number,
  top: number,
  width: number,
  height: number,
): string {
  if (values.length === 0 || maxMph <= 0) {
    return "";
  }

  return values
    .map((value, index) => {
      const x =
        values.length === 1
          ? left + width / 2
          : left + (index / (values.length - 1)) * width;
      const y = top + height - (Math.min(value, maxMph) / maxMph) * height;

      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}
