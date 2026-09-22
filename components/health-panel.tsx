import { Metric } from "@/components/metric";
import type { AirHealthAdvice } from "@/lib/air-quality";
import { POLLEN_LABELS } from "@/lib/air-quality";
import { formatNumber } from "@/lib/units";

function aqiTone(advice: AirHealthAdvice): "positive" | "caution" | "accent" {
  if (advice.severity === "ok") {
    return "positive";
  }
  if (advice.severity === "stop") {
    return "accent";
  }

  return "caution";
}

export function HealthPanel({ advice }: { advice: AirHealthAdvice }) {
  const tone = aqiTone(advice);

  return (
    <div>
      <p className="text-sm text-muted">{advice.headline}.</p>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <Metric
          label="US AQI"
          value={formatNumber(advice.usAqi)}
          detail={`${advice.bandLabel} · peak ${advice.peakTime}`}
          tone={tone}
        />
        <Metric
          label="At the start"
          value={formatNumber(advice.startAqi)}
          detail={
            advice.pollutant === "ozone"
              ? "Ozone is the limiter"
              : advice.pollutant === "particles"
                ? "Particles are the limiter"
                : "Mixed pollutants"
          }
        />
      </div>

      <dl className="mt-5 flex flex-col gap-3 border-t border-border-subtle pt-4">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-sm text-muted">PM2.5</dt>
          <dd className="text-sm font-semibold tabular-nums">
            {formatNumber(advice.pm25, 1)} µg/m³
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-sm text-muted">Ozone</dt>
          <dd className="text-sm font-semibold tabular-nums">
            {formatNumber(advice.ozone, 1)} µg/m³
          </dd>
        </div>
        {advice.dust != null && advice.dust >= 1 ? (
          <div className="flex items-center justify-between gap-4">
            <dt className="text-sm text-muted">Dust</dt>
            <dd className="text-sm font-semibold tabular-nums">
              {formatNumber(advice.dust, 1)} µg/m³
            </dd>
          </div>
        ) : null}
        {advice.pollen.map((reading) => (
          <div
            key={reading.kind}
            className="flex items-center justify-between gap-4"
          >
            <dt className="text-sm text-muted">{reading.kind} pollen</dt>
            <dd className="text-sm font-semibold tabular-nums">
              {POLLEN_LABELS[reading.level]}
            </dd>
          </div>
        ))}
      </dl>

      <p
        className={`mt-5 rounded-xl px-4 py-3 text-xs leading-relaxed ${
          advice.severity === "ok"
            ? "border border-border-subtle bg-surface-raised/60 text-muted"
            : advice.severity === "stop"
              ? "border border-accent/30 bg-accent/10 text-accent"
              : "border border-caution/25 bg-caution/10 text-caution"
        }`}
      >
        {advice.detail}
      </p>
    </div>
  );
}
