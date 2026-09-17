import { Metric } from "@/components/metric";
import type { RiderProfile, RouteSummary } from "@/lib/briefing";
import { INTENSITY_LABELS } from "@/lib/briefing";
import type { FuelingAdvice } from "@/lib/recommendations";
import { formatDuration, formatNumber } from "@/lib/units";

export function FuelingPanel({
  fueling,
  rider,
  route,
}: {
  fueling: FuelingAdvice;
  rider: RiderProfile;
  route: RouteSummary;
}) {
  return (
    <div>
      <p className="text-sm text-muted">
        {formatDuration(route.movingHours)} at{" "}
        {INTENSITY_LABELS[rider.intensity].toLowerCase()}, averaging{" "}
        {formatNumber(fueling.averageTempC, 1)}°.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <Metric
          label="Carbs"
          value={formatNumber(fueling.carbsPerHourG)}
          unit="g/hr"
          detail={`${formatNumber(fueling.totalCarbsG)} g over the ride`}
          tone="accent"
        />
        <Metric
          label="Fluid"
          value={formatNumber(fueling.fluidPerHourMl)}
          unit="ml/hr"
          detail={`${formatNumber(fueling.totalFluidMl / 1000, 1)} L over the ride`}
          tone="accent"
        />
      </div>

      <dl className="mt-5 flex flex-col gap-3 border-t border-border-subtle pt-4">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-sm text-muted">Sodium</dt>
          <dd className="text-sm font-semibold tabular-nums">
            {formatNumber(fueling.sodiumPerHourMg)} mg/hr
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-sm text-muted">Bottles</dt>
          <dd className="text-sm font-semibold tabular-nums">
            {fueling.bottles} × 500 ml
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-sm text-muted">Refills</dt>
          <dd className="text-sm font-semibold tabular-nums">
            {fueling.refills === 0
              ? "None needed"
              : `${fueling.refills} en route`}
          </dd>
        </div>
      </dl>

      <p className="mt-5 rounded-xl border border-border-subtle bg-surface-raised/60 px-4 py-3 text-xs leading-relaxed text-muted">
        Start eating in the first 30 minutes and keep to{" "}
        {formatNumber(Math.round(fueling.carbsPerHourG / 3))} g every 20 minutes
        — catching up after the climbs never works.
      </p>
    </div>
  );
}
