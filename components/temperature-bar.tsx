import type { HourlyConditions } from "@/lib/briefing";
import {
  celsiusDeltaToFahrenheit,
  celsiusToFahrenheit,
  formatNumber,
  formatTempF,
} from "@/lib/units";

/** Cold blue through to hot red, interpolated between these anchors. */
const SCALE: { tempC: number; rgb: [number, number, number] }[] = [
  { tempC: -5, rgb: [96, 165, 250] },
  { tempC: 5, rgb: [56, 189, 248] },
  { tempC: 12, rgb: [45, 212, 191] },
  { tempC: 18, rgb: [250, 204, 21] },
  { tempC: 24, rgb: [252, 76, 2] },
  { tempC: 32, rgb: [239, 68, 68] },
];

function temperatureColour(tempC: number): string {
  const upperIndex = SCALE.findIndex((stop) => tempC <= stop.tempC);

  if (upperIndex <= 0) {
    const clamped = upperIndex === 0 ? SCALE[0] : SCALE[SCALE.length - 1];

    return `rgb(${clamped.rgb.join(" ")})`;
  }

  const lower = SCALE[upperIndex - 1];
  const upper = SCALE[upperIndex];
  const ratio = (tempC - lower.tempC) / (upper.tempC - lower.tempC);
  const mixed = lower.rgb.map((channel, index) =>
    Math.round(channel + (upper.rgb[index] - channel) * ratio),
  );

  return `rgb(${mixed.join(" ")})`;
}

function displayTempF(tempC: number): number {
  return Math.round(celsiusToFahrenheit(tempC));
}

export function TemperatureBar({
  hourly,
  source,
}: {
  hourly: HourlyConditions[];
  source?: string;
}) {
  if (hourly.length === 0) {
    return null;
  }
  const gradient = hourly
    .map((hour, index) => {
      const position =
        hourly.length === 1 ? 0 : (index / (hourly.length - 1)) * 100;

      return `${temperatureColour(hour.tempC)} ${position.toFixed(1)}%`;
    })
    .join(", ");

  const coldest = hourly.reduce((cold, hour) =>
    hour.tempC < cold.tempC ? hour : cold,
  );
  const warmest = hourly.reduce((warm, hour) =>
    hour.tempC > warm.tempC ? hour : warm,
  );
  const biggestWindChill = Math.max(
    ...hourly.map((hour) => hour.tempC - hour.feelsLikeC),
  );
  const wettest = hourly.reduce((wet, hour) =>
    hour.precipChance > wet.precipChance ? hour : wet,
  );

  return (
    <section
      aria-labelledby="temperature-heading"
      className="rounded-2xl border border-border-subtle bg-surface p-5 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <h2
          id="temperature-heading"
          className="font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-accent"
        >
          Hourly temp & rain
        </h2>
        <div className="text-right">
          <p className="text-xs tabular-nums text-muted">
            {displayTempF(coldest.tempC)}°F → {displayTempF(warmest.tempC)}°F
          </p>
          <p className="mt-0.5 text-xs tabular-nums text-muted">
            rain to {wettest.precipChance}%
          </p>
          {source ? (
            <p className="mt-1 font-mono text-[0.625rem] uppercase tracking-[0.14em] text-muted">
              {source}
            </p>
          ) : null}
        </div>
      </div>

      <div
        role="img"
        aria-label={`Temperature from ${displayTempF(coldest.tempC)} to ${displayTempF(warmest.tempC)} degrees Fahrenheit. Chance of rain peaks at ${wettest.precipChance} percent at ${wettest.time}.`}
        className="mt-4 h-3 rounded-full"
        style={{ backgroundImage: `linear-gradient(to right, ${gradient})` }}
      />

      <ol
        className="mt-3 grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${hourly.length}, minmax(0, 1fr))`,
        }}
      >
        {hourly.map((hour) => (
          <li key={hour.time} className="text-center">
            <span className="block text-sm font-semibold tabular-nums">
              {displayTempF(hour.tempC)}°
            </span>
            <span
              className={`block font-mono text-[0.625rem] tabular-nums ${
                hour.precipChance >= 30 ? "text-caution" : "text-muted"
              }`}
            >
              {hour.precipChance}%
            </span>
            <span className="block font-mono text-[0.625rem] text-muted">
              {hour.time.slice(0, 2)}
            </span>
          </li>
        ))}
      </ol>

      <p className="mt-4 border-t border-border-subtle pt-3 text-xs text-muted">
        Air temperature. The wind takes up to{" "}
        {formatNumber(celsiusDeltaToFahrenheit(biggestWindChill), 1)}°F off
        that, so dress for {formatTempF(hourly[0].feelsLikeC)} at the start.
      </p>
    </section>
  );
}
