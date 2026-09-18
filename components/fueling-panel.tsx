import { Metric } from "@/components/metric";
import { NumberField } from "@/components/number-field";
import type { FuelingResult } from "@/lib/calculations";
import {
  celsiusToFahrenheit,
  fahrenheitToCelsius,
  formatDuration,
  formatNumber,
  formatTempF,
  kjToKcal,
  mlToFlOz,
  roundTo,
} from "@/lib/units";

const BOTTLE_ML = 500;

export function FuelingPanel({
  durationHours,
  temperatureC,
  targetWatts,
  giTolerance,
  onDurationHours,
  onTemperatureC,
  onTargetWatts,
  onGiTolerance,
  fueling,
  dewPointC,
}: {
  durationHours: number;
  temperatureC: number;
  targetWatts: number;
  giTolerance: number;
  onDurationHours: (value: number) => void;
  onTemperatureC: (value: number) => void;
  onTargetWatts: (value: number) => void;
  onGiTolerance: (value: number) => void;
  fueling: FuelingResult;
  dewPointC: number;
}) {
  const totalCarbsG = Math.round(fueling.carbsPerHour * durationHours);
  const totalFluidMl = Math.round(fueling.fluidMlPerHour * durationHours);
  const bottles = Math.max(1, Math.ceil(totalFluidMl / BOTTLE_ML));
  const refills = Math.max(0, bottles - 2);
  const bottleOz = Math.round(mlToFlOz(BOTTLE_ML));
  const fluidOzPerHour = mlToFlOz(fueling.fluidMlPerHour);
  const totalFluidOz = mlToFlOz(totalFluidMl);

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
          value={roundTo(celsiusToFahrenheit(temperatureC), 1)}
          onChange={(fahrenheit) =>
            onTemperatureC(roundTo(fahrenheitToCelsius(fahrenheit), 0.1))
          }
          unit="°F"
          min={14}
          max={113}
          step={1}
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

      <label className="mt-4 flex flex-col gap-1.5">
        <span className="flex items-center justify-between gap-3">
          <span className="font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-muted">
            GI tolerance
          </span>
          <span className="text-xs tabular-nums text-muted">
            {Math.round(giTolerance * 100)}% of ACSM target
          </span>
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={giTolerance}
          onChange={(event) => onGiTolerance(Number(event.target.value))}
          className="accent-accent"
          aria-label="GI tolerance"
        />
      </label>

      <p className="mt-4 text-sm text-muted">
        {`${formatDuration(durationHours)} at ${formatNumber(targetWatts)} W, ${formatTempF(temperatureC, 1)} air / ${formatTempF(dewPointC, 1)} dew point.`}
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
          value={formatNumber(fluidOzPerHour)}
          unit="oz/hr"
          detail={`${formatNumber(totalFluidOz, 1)} oz over the ride`}
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
          <dt className="text-sm text-muted">Work</dt>
          <dd className="text-sm font-semibold tabular-nums">
            {formatNumber(kjToKcal(fueling.energyKj))} Cal
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-sm text-muted">Bottles</dt>
          <dd className="text-sm font-semibold tabular-nums">
            {bottles} × {bottleOz} oz
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
        ACSM/ISSN: 30–90 g carbohydrate per hour on rides over 90 minutes. Start
        in the first 30 minutes and keep to{" "}
        {formatNumber(Math.round(fueling.carbsPerHour / 3))} g every 20 minutes —
        catching up after the climbs never works. Turn GI tolerance down if your
        gut is the limiter.
      </p>
    </div>
  );
}
