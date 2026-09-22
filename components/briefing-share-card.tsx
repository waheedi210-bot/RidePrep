import type { HourlyConditions, RouteSummary } from "@/lib/briefing";
import { SURFACE_LABELS } from "@/lib/briefing";
import type { ApparelAdvice, WindAdvice } from "@/lib/recommendations";
import {
  formatShareDate,
  formatShareTime,
} from "@/lib/share-briefing";
import {
  celsiusToFahrenheit,
  formatDuration,
  formatMph,
  formatNumber,
  formatTempF,
  kmToMiles,
  kphToMph,
  metresToFeet,
} from "@/lib/units";

function Metric({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit?: string;
}) {
  return (
    <div>
      <p
        className="font-mono text-[0.625rem] uppercase tracking-[0.14em]"
        style={{ color: "#94a3b8" }}
      >
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums">
        {value}
        {unit ? (
          <span className="ml-1 text-xs font-medium" style={{ color: "#94a3b8" }}>
            {unit}
          </span>
        ) : null}
      </p>
    </div>
  );
}

export function BriefingShareCard({
  route,
  dateYmd,
  timeHm,
  hourly,
  wind,
  apparel,
}: {
  route: RouteSummary;
  dateYmd: string;
  timeHm: string;
  hourly: HourlyConditions[];
  wind: WindAdvice;
  apparel: ApparelAdvice;
}) {
  const distanceMi = kmToMiles(route.distanceKm);
  const elevationFt = metresToFeet(route.elevationGainM);
  const coldest = hourly.reduce((cold, hour) =>
    hour.tempC < cold.tempC ? hour : cold,
  );
  const warmest = hourly.reduce((warm, hour) =>
    hour.tempC > warm.tempC ? hour : warm,
  );
  const wettest = hourly.reduce((wet, hour) =>
    hour.precipChance > wet.precipChance ? hour : wet,
  );
  const peakUv = Math.max(...hourly.map((hour) => hour.uvIndex));
  const avgHumidity = Math.round(
    hourly.reduce((total, hour) => total + hour.humidityPct, 0) / hourly.length,
  );
  const avgDewPointC =
    hourly.reduce((total, hour) => total + hour.dewPointC, 0) / hourly.length;

  return (
    <article
      className="box-border w-[390px] bg-surface px-5 py-6 text-foreground"
      style={{ backgroundColor: "#16203a", color: "#e6ecf7" }}
    >
      <header>
        <p
          className="font-mono text-[0.6875rem] uppercase tracking-[0.18em]"
          style={{ color: "#fc4c02" }}
        >
          RidePrep · Pre-ride briefing
        </p>
        <h1 className="mt-2 text-2xl font-semibold leading-tight">
          {route.name}
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#94a3b8" }}>
          {route.region} · {SURFACE_LABELS[route.surface]}
        </p>
        <p className="mt-3 text-sm font-semibold">
          {formatShareDate(dateYmd)} · {formatShareTime(timeHm)} roll-out
        </p>
      </header>

      <dl
        className="mt-5 grid grid-cols-3 gap-3 border-t pt-4"
        style={{ borderColor: "#27344f" }}
      >
        <Metric
          label="Distance"
          value={formatNumber(distanceMi, 1)}
          unit="mi"
        />
        <Metric
          label="Elevation"
          value={formatNumber(elevationFt)}
          unit="ft"
        />
        <Metric label="Moving" value={formatDuration(route.movingHours)} />
      </dl>

      <section className="mt-5 border-t pt-4" style={{ borderColor: "#27344f" }}>
        <h2
          className="font-mono text-[0.6875rem] uppercase tracking-[0.18em]"
          style={{ color: "#fc4c02" }}
        >
          Weather
        </h2>
        <p className="mt-2 text-sm leading-relaxed">
          {Math.round(celsiusToFahrenheit(coldest.tempC))}–
          {Math.round(celsiusToFahrenheit(warmest.tempC))}°F air · feels{" "}
          {formatTempF(apparel.startFeelsLikeC)} at the start
        </p>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: "#94a3b8" }}>
          Wind {wind.fromLabel} {Math.round(wind.fromDeg)}°,{" "}
          {formatMph(wind.averageKph)} with gusts to {formatMph(wind.maxGustKph)}
        </p>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: "#94a3b8" }}>
          Rain to {wettest.precipChance}% · UV {formatNumber(peakUv, 1)} ·
          Humidity {avgHumidity}% · Dew {formatTempF(avgDewPointC)}
        </p>

        {hourly.length > 0 ? (
          <ol
            className="mt-4 grid gap-1"
            style={{
              gridTemplateColumns: `repeat(${Math.min(hourly.length, 8)}, minmax(0, 1fr))`,
            }}
          >
            {hourly.slice(0, 8).map((hour) => (
              <li key={hour.time} className="text-center">
                <span className="block text-sm font-semibold tabular-nums">
                  {Math.round(celsiusToFahrenheit(hour.tempC))}°
                </span>
                <span
                  className="block font-mono text-[0.625rem] tabular-nums"
                  style={{
                    color: hour.precipChance >= 30 ? "#fbbf24" : "#94a3b8",
                  }}
                >
                  {hour.precipChance}%
                </span>
                <span
                  className="block font-mono text-[0.625rem]"
                  style={{ color: "#94a3b8" }}
                >
                  {hour.time.slice(0, 2)}
                </span>
              </li>
            ))}
          </ol>
        ) : null}

        <div
          className="mt-4 grid grid-cols-2 gap-3 border-t pt-3 text-sm"
          style={{ borderColor: "#27344f" }}
        >
          <p>
            <span
              className="font-mono text-[0.625rem] uppercase tracking-[0.14em]"
              style={{ color: "#94a3b8" }}
            >
              Outbound
            </span>
            <span className="mt-1 block font-semibold capitalize">
              {wind.outboundLeg}
            </span>
          </p>
          <p>
            <span
              className="font-mono text-[0.625rem] uppercase tracking-[0.14em]"
              style={{ color: "#94a3b8" }}
            >
              Return
            </span>
            <span className="mt-1 block font-semibold capitalize">
              {wind.returnLeg}
            </span>
          </p>
          <p>
            <span
              className="font-mono text-[0.625rem] uppercase tracking-[0.14em]"
              style={{ color: "#94a3b8" }}
            >
              Peak gust
            </span>
            <span className="mt-1 block font-semibold tabular-nums">
              {formatNumber(kphToMph(wind.maxGustKph))} mph
            </span>
          </p>
          <p>
            <span
              className="font-mono text-[0.625rem] uppercase tracking-[0.14em]"
              style={{ color: "#94a3b8" }}
            >
              Peak feels
            </span>
            <span className="mt-1 block font-semibold tabular-nums">
              {formatTempF(apparel.peakFeelsLikeC)}
            </span>
          </p>
        </div>
      </section>

      <section className="mt-5 border-t pt-4" style={{ borderColor: "#27344f" }}>
        <h2
          className="font-mono text-[0.6875rem] uppercase tracking-[0.18em]"
          style={{ color: "#fc4c02" }}
        >
          Apparel
        </h2>
        <ul className="mt-3 flex flex-col gap-3">
          {apparel.picks.map((pick) => (
            <li key={pick.slot}>
              <p
                className="font-mono text-[0.625rem] uppercase tracking-[0.14em]"
                style={{ color: "#fc4c02" }}
              >
                {pick.slot}
              </p>
              <p className="mt-0.5 text-sm font-semibold leading-snug">
                {pick.item}
              </p>
            </li>
          ))}
        </ul>
        {apparel.shedAtTime ? (
          <p className="mt-3 text-xs leading-relaxed" style={{ color: "#fbbf24" }}>
            Shed layers around {apparel.shedAtTime}.
          </p>
        ) : null}
        {apparel.sunscreenHint ? (
          <p className="mt-2 text-xs leading-relaxed" style={{ color: "#fbbf24" }}>
            {apparel.sunscreenHint}
          </p>
        ) : null}
      </section>
    </article>
  );
}
