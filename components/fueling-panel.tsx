import { Metric } from "@/components/metric";
import { NumberField } from "@/components/number-field";
import type { FuelingResult } from "@/lib/calculations";
import { formatDuration, formatNumber } from "@/lib/units";

export function FuelingPanel({
  durationHours,
  temperatureC,
  targetWatts,
  onDurationHours,
  onTemperatureC,
  onTargetWatts,
  fueling,
}: {
  durationHours: number;
  temperatureC: number;
  targetWatts: number;
  onDurationHours: (value: number) => void;
  onTemperatureC: (value: number) => void;
  onTargetWatts: (value: number) => void;
  fueling: FuelingResult;
}) {
  const totalCarbsG = Math.round(fueling.carbsPerHour * durationHours);
  const totalFluidMl = Math.round(fueling.fluidMlPerHour * durationHours);
  const bottles = Math.max(1, Math.ceil(totalFluidMl / 500));
  const refills = Math.max(0, bottles - 2);

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <NumberField
          label="Duration"
          value={durationHours}
          onChange={onDurationHours}
          unit="hr"
          min={0.5}
          max={12}
          step={0.1}
        />
        <NumberField
          label="Temperature"
          value={temperatureC}
          onChange={onTemperatureC}
          unit="°C"
          min={-10}
          max={45}
          step={0.5}
        />
        <NumberField
          label="Target power"
          value={targetWatts}
          onChange={onTargetWatts}
          unit="W"
          min={80}
          max={400}
          step={5}
        />
      </div>

      <p className="mt-4 text-sm text-muted">
        {`${formatDuration(durationHours)} at ${formatNumber(targetWatts)} W, ${formatNumber(temperatureC, 1)}° air temp.`}
      </p>

      <div className="mt-5 grid grid-cols-2 gap-4">
        <Metric
          label="Carbs"
          value={formatNumber(fueling.carbsPerHour)}
          unit="g/hr"
          detail={`${formatNumber(totalCarbsG)} g over the ride`}
          tone="accent"
        />
        <Metric
          label="Fluid"
          value={formatNumber(fueling.fluidMlPerHour)}
          unit="ml/hr"
          detail={`${formatNumber(totalFluidMl / 1000, 1)} L over the ride`}
          tone="accent"
        />
      </div>

      <dl className="mt-5 flex flex-col gap-3 border-t border-border-subtle pt-4">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-sm text-muted">Bottles</dt>
          <dd className="text-sm font-semibold tabular-nums">
            {bottles} × 500 ml
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-sm text-muted">Refills</dt>
          <dd className="text-sm font-semibold tabular-nums">
            {refills === 0 ? "None needed" : `${refills} en route`}
          </dd>
        </div>
      </dl>

      <p className="mt-5 rounded-xl border border-border-subtle bg-surface-raised/60 px-4 py-3 text-xs leading-relaxed text-muted">
        Start eating in the first 30 minutes and keep to{" "}
        {formatNumber(Math.round(fueling.carbsPerHour / 3))} g every 20 minutes
        — catching up after the climbs never works.
      </p>
    </div>
  );
}
